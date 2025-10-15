# CommonForms Backend Deployment Guide (Railway + R2)

This guide provides step-by-step instructions for deploying the CommonForms inference API to Railway with Cloudflare R2 storage and Redis for job state management.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Cloudflare    │────▶│   Railway    │────▶│ Cloudflare   │
│     (CDN)       │     │   (Compute)  │     │     R2       │
└─────────────────┘     └──────────────┘     │   (Storage)  │
                               │              └──────────────┘
                               ▼
                        ┌──────────────┐
                        │Railway Redis │
                        │  (Job State) │
                        └──────────────┘
```

- **Compute**: Railway (Docker container with auto-deploy from GitHub)
- **Storage**: Cloudflare R2 (S3-compatible, FREE egress)
- **State**: Railway Redis addon (job metadata and progress)
- **CDN**: Cloudflare (SSL, DDoS protection, health checks)

## Prerequisites

1. **Railway Account** - Start with $5/month hobby plan
2. **Cloudflare Account** - With R2 storage enabled
3. **Custom Domain** - Managed by Cloudflare
4. **GitHub Repository** - Railway deploys from GitHub

## Cost Breakdown

| Service | Estimated Monthly Cost | Notes |
|---------|----------------------|--------|
| Railway Hobby | $5 | Includes $5 credits, ~300MB RAM |
| Railway Pro | $15-30 | 1 vCPU + 2GB RAM typical usage |
| Railway Redis | $5-10 | Small instance for job state |
| Cloudflare R2 | ~$1 | Storage + operations, FREE egress |
| **Total** | **$11-41** | Depending on scale |

## Step 1: Create Optimized Dockerfile

Create `Dockerfile` in repository root:

```dockerfile
# Build stage with uv for fast dependency installation
FROM python:3.11-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy dependency files first (for better caching)
COPY pyproject.toml uv.lock ./
COPY packages/commonforms-core/pyproject.toml packages/commonforms-core/
COPY apps/inference-api/pyproject.toml apps/inference-api/

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy source code and models
COPY packages packages
COPY apps/inference-api apps/inference-api

# Runtime stage
FROM python:3.11-slim

# Install runtime dependencies for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps apps

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:${PATH}"
ENV PYTHONPATH="/app"

# Railway provides PORT env var
EXPOSE ${PORT:-8000}

# Use Railway's PORT variable
CMD uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --app-dir apps/inference-api \
    --workers 1
```

## Step 2: Configure R2 Storage

### 2.1 Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create bucket named `commonforms-pdfs`
3. Configure lifecycle rule:
   - Rule name: `cleanup-old-files`
   - Prefix: `jobs/`
   - Delete after: 7 days

### 2.2 Generate R2 Credentials

1. Go to R2 → Manage R2 API tokens
2. Create new token with permissions:
   - Object Read & Write
   - Bucket: `commonforms-pdfs`
3. Save credentials:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=commonforms-pdfs
   R2_ENDPOINT_URL=https://{account_id}.r2.cloudflarestorage.com
   ```

### 2.3 Update Storage Implementation

Create `apps/inference-api/app/storage_r2.py`:

```python
import os
from typing import BinaryIO
import boto3
from botocore.client import Config
from pathlib import Path
import asyncio
from datetime import timedelta

class R2StorageManager:
    """Manages PDF storage in Cloudflare R2."""

    def __init__(self):
        account_id = os.environ["CLOUDFLARE_ACCOUNT_ID"]
        self.bucket_name = os.environ["R2_BUCKET_NAME"]

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )

    async def upload_pdf(self, job_id: str, file: BinaryIO, filename: str) -> str:
        """Upload PDF to R2 and return the key."""
        key = f"jobs/{job_id}/input/{filename}"

        # Upload in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self.s3_client.upload_fileobj,
            file,
            self.bucket_name,
            key
        )

        return key

    async def save_output(self, job_id: str, file_path: Path) -> str:
        """Save processed PDF to R2."""
        key = f"jobs/{job_id}/output/result.pdf"

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self.s3_client.upload_file,
            str(file_path),
            self.bucket_name,
            key
        )

        return key

    def get_download_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate presigned download URL (1 hour default)."""
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in
        )

    async def delete_job_files(self, job_id: str):
        """Clean up all files for a job."""
        prefix = f"jobs/{job_id}/"

        # List and delete all objects with prefix
        response = self.s3_client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix=prefix
        )

        if "Contents" in response:
            objects = [{"Key": obj["Key"]} for obj in response["Contents"]]
            self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={"Objects": objects}
            )
```

## Step 3: Add Redis for Job State

### 3.1 Update Job Manager

Create `apps/inference-api/app/redis_job_manager.py`:

```python
import redis
import json
from typing import Optional
from datetime import datetime, timedelta

class RedisJobManager:
    """Manages job state in Redis for persistence and scaling."""

    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(
            redis_url,
            decode_responses=True
        )
        # Set key TTL to 24 hours (jobs expire after 1 day)
        self.job_ttl = timedelta(hours=24)

    def create_job(self, job_id: str, metadata: dict) -> dict:
        """Create new job in Redis."""
        job_data = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "metadata": metadata
        }

        # Store as JSON with expiration
        self.redis_client.setex(
            f"job:{job_id}",
            self.job_ttl,
            json.dumps(job_data)
        )

        # Add to active jobs set
        self.redis_client.sadd("active_jobs", job_id)

        return job_data

    def update_job(self, job_id: str, **updates) -> Optional[dict]:
        """Update job status/progress."""
        job_data = self.get_job(job_id)
        if not job_data:
            return None

        job_data.update(updates)
        job_data["updated_at"] = datetime.utcnow().isoformat()

        # Re-save with fresh TTL
        self.redis_client.setex(
            f"job:{job_id}",
            self.job_ttl,
            json.dumps(job_data)
        )

        # Remove from active set if terminal state
        if job_data["status"] in ["ready", "failed"]:
            self.redis_client.srem("active_jobs", job_id)

        return job_data

    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job details from Redis."""
        data = self.redis_client.get(f"job:{job_id}")
        return json.loads(data) if data else None

    def list_active_jobs(self) -> list[str]:
        """List all active job IDs."""
        return list(self.redis_client.smembers("active_jobs"))
```

## Step 4: Add Health Check Endpoint

Update `apps/inference-api/app/main.py`:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import redis
import boto3

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown."""
    # Startup: Initialize connections
    app.state.redis = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost"))
    app.state.r2_storage = R2StorageManager()

    yield

    # Shutdown: Clean up connections
    app.state.redis.close()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health_check():
    """Health check for Railway/Cloudflare monitoring."""
    checks = {
        "status": "healthy",
        "redis": "unknown",
        "r2": "unknown"
    }

    # Check Redis
    try:
        app.state.redis.ping()
        checks["redis"] = "connected"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"
        checks["status"] = "degraded"

    # Check R2
    try:
        # Quick list to verify credentials
        app.state.r2_storage.s3_client.head_bucket(Bucket=os.environ["R2_BUCKET_NAME"])
        checks["r2"] = "connected"
    except Exception as e:
        checks["r2"] = f"error: {str(e)}"
        checks["status"] = "degraded"

    return checks

@app.get("/metrics")
async def metrics():
    """Expose metrics for monitoring."""
    active_jobs = len(app.state.redis.smembers("active_jobs"))

    return {
        "active_jobs": active_jobs,
        "redis_connected": app.state.redis.ping(),
        "version": "1.0.0"
    }
```

## Step 5: Deploy to Railway

### 5.1 Connect GitHub Repository

1. Sign up at [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub repo
3. Select your CommonForms repository
4. Railway auto-detects Dockerfile

### 5.2 Add Redis Service

1. In Railway project → New Service → Database → Redis
2. Railway provides `REDIS_URL` automatically

### 5.3 Configure Environment Variables

In Railway project settings → Variables:

```bash
# R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=commonforms-pdfs

# API Configuration
COMMONFORMS_DEFAULT_MODEL=FFDNet-S
COMMONFORMS_DEVICE=cpu
COMMONFORMS_FAST_MODE=true  # Use ONNX for CPU
COMMONFORMS_MAX_CONCURRENT_JOBS=2
COMMONFORMS_MAX_UPLOAD_MB=20
COMMONFORMS_CORS_ORIGINS='["https://your-domain.com"]'

# Redis is auto-configured by Railway
# REDIS_URL=redis://...  (provided by Railway)
```

### 5.4 Configure Railway Settings

1. **Settings → General**:
   - Root Directory: `/`
   - Build Command: (leave empty, uses Dockerfile)
   - Start Command: (leave empty, uses Dockerfile CMD)

2. **Settings → Deploy**:
   - Auto-deploy: Enabled
   - Branch: main

3. **Settings → Networking**:
   - Generate domain: `commonforms.up.railway.app`
   - Port: Railway auto-detects from Dockerfile

## Step 6: Configure Cloudflare

### 6.1 Add Custom Domain

1. Railway → Settings → Domains → Add Custom Domain
2. Enter: `api.yourdomain.com`
3. Railway provides CNAME target

### 6.2 Configure Cloudflare DNS

1. Cloudflare Dashboard → DNS
2. Add CNAME record:
   - Name: `api`
   - Target: `commonforms.up.railway.app`
   - Proxy: Enabled (orange cloud)

### 6.3 Set Up Health Monitoring

1. Cloudflare → Health Checks → Create
2. Configuration:
   - Name: CommonForms API
   - URL: `https://api.yourdomain.com/health`
   - Interval: 60 seconds
   - Method: GET
   - Expected: 200 status code

### 6.4 Configure Firewall Rules

1. Cloudflare → Security → WAF
2. Create rule for rate limiting:
   - Expression: `(http.request.uri.path eq "/jobs")`
   - Action: Rate limit (10 requests per minute per IP)

## Step 7: Monitor and Debug

### 7.1 Railway Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs

# SSH into container (Pro plan)
railway run bash
```

### 7.2 Cloudflare Analytics

1. View in Cloudflare Dashboard → Analytics
2. Metrics available:
   - Request volume
   - Response times
   - Error rates
   - Bandwidth usage

### 7.3 Application Metrics

Access metrics endpoint:
```bash
curl https://api.yourdomain.com/metrics
```

## Step 8: Production Checklist

- [ ] **Environment Variables**: All set in Railway
- [ ] **Health Check**: Responding at `/health`
- [ ] **CORS**: Configured for your domains
- [ ] **Rate Limiting**: Enabled in Cloudflare WAF
- [ ] **SSL/TLS**: Full (strict) mode in Cloudflare
- [ ] **R2 Lifecycle**: Old files auto-delete after 7 days
- [ ] **Redis Persistence**: Enabled in Railway Redis settings
- [ ] **Error Tracking**: Consider adding Sentry
- [ ] **Backup Strategy**: R2 versioning or replication

## Scaling Considerations

### When to Upgrade from Hobby to Pro

- Memory usage > 250MB consistently
- CPU usage > 0.1 vCPU
- Need for horizontal scaling
- Require SSH access for debugging

### Horizontal Scaling (Pro Plan)

1. Railway → Service Settings → Scaling
2. Set replicas: 2-4
3. Redis handles shared state automatically
4. R2 handles concurrent access

### Performance Optimizations

1. **Use ONNX models** (`COMMONFORMS_FAST_MODE=true`)
2. **Limit concurrent jobs** based on CPU cores
3. **Stream large files** directly to R2
4. **Cache model loading** in container

## Troubleshooting

### Common Issues

1. **Out of Memory**:
   - Scale to larger Railway instance
   - Reduce `COMMONFORMS_MAX_CONCURRENT_JOBS`
   - Use smaller model (FFDNet-S vs FFDNet-L)

2. **Slow Processing**:
   - Enable ONNX mode
   - Upgrade to more vCPUs
   - Check Cloudflare isn't caching POST requests

3. **R2 Connection Issues**:
   - Verify credentials in Railway variables
   - Check R2 bucket exists and is accessible
   - Ensure region is set to "auto"

4. **Redis Connection Lost**:
   - Railway Redis auto-reconnects
   - Implement retry logic in RedisJobManager
   - Check Redis memory usage in Railway

## Next Steps

1. **Add API Authentication**:
   ```python
   from fastapi import Security, HTTPException
   from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

   security = HTTPBearer()

   def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
       if credentials.credentials != os.environ.get("API_KEY"):
           raise HTTPException(401)
   ```

2. **Implement Job Queue** (for better scaling):
   ```python
   # Use RQ (Redis Queue) for background processing
   from rq import Queue
   from redis import Redis

   redis_conn = Redis.from_url(os.environ["REDIS_URL"])
   q = Queue(connection=redis_conn)

   # Queue job for processing
   job = q.enqueue(process_pdf, job_id, file_path)
   ```

3. **Add Structured Logging**:
   ```python
   import structlog

   logger = structlog.get_logger()
   logger.info("job_processed", job_id=job_id, duration=duration)
   ```

4. **Set Up Monitoring**:
   - Connect Railway to Datadog/New Relic
   - Use Cloudflare Analytics API
   - Set up alerts for error rates

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment)

## Conclusion

This setup provides:
- ✅ Automatic deployments from GitHub
- ✅ Scalable compute with Railway
- ✅ Free egress with R2 storage
- ✅ Persistent job state with Redis
- ✅ Global CDN and DDoS protection
- ✅ Built-in health monitoring
- ✅ Cost-effective for small to medium scale

Estimated monthly cost: $11-41 depending on usage, with ability to scale as needed.