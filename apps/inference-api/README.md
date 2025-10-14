# CommonForms Inference API (Prototype)

This FastAPI service is the bridge between the Chrome extension and the Python `commonforms` package. It accepts PDF uploads, triggers background processing, and exposes status endpoints the extension can poll.

## Local Development

```bash
cd apps/inference-api
uv pip install -e ../../commonforms
uv pip install -e .[dev]
uv run uvicorn app.main:app --reload --port 8080
```

The service stores transient uploads and generated PDFs under `.jobs/`. The directory is ignored by git but should be cleaned periodically.

## API Surface

- `POST /prepare` — accepts `multipart/form-data` with a `pdf` file. Returns `{ "job_id": "<hex>" }`.
- `GET /prepare/{job_id}` — returns `status` JSON while the job is running, or streams the generated PDF once complete.

The background worker currently runs inline through FastAPI's `BackgroundTasks`. Swap this out for a proper queue (Celery, Dramatiq, AWS SQS) before handling production traffic.

## Next Steps

- Wire authentication or signed URLs before accepting end-user PDFs.
- Persist jobs in PostgreSQL/Redis instead of the filesystem.
- Emit webhooks or Server-Sent Events so the extension can react without polling.
