# FastAPI Async Job Service Plan

## Objectives
- Accept PDF uploads through a FastAPI endpoint and return a job identifier immediately.
- Allow clients to poll for job status and progress until the generated fillable PDF is ready.
- Provide a download endpoint for the resulting PDF when processing completes.
- Keep architecture flexible for future queue backends, storage locations, and worker scaling.

## API Surface

### `POST /jobs`
- **Payload**: multipart form with `file` (required) and optional `options` JSON matching `prepare_form` args.
- **Response**: `202 Accepted`, body `{job_id, status: "queued", progress: 0.0}`.
- **Validation**:
  - Reject non-PDF content types or empty files.
  - Attempt to open via `pypdfium2` to catch encrypted PDFs early.
  - Enforce maximum file size via settings.

### `GET /jobs/{job_id}`
- **Response**: JSON `{job_id, status, progress, message?, download_url?}`.
- Status values: `queued`, `validating`, `rendering`, `detecting`, `writing`, `ready`, `failed`.
- Supply `progress` (0.0–1.0) with coarse increments per stage; include optional message for diagnostics.
- On `ready`, include `download_url`.
- On `failed`, include `error.type` (e.g., `EncryptedPdfError`) and `error.detail`.

### `GET /jobs/{job_id}/result`
- Streams generated PDF (`application/pdf`) when status is `ready`.
- Before completion return `404` or `409` depending on strategy.
- Optionally require short-lived token or same `job_id` secret.

### Future Optional Endpoints
- `GET /health` for monitoring.
- `DELETE /jobs/{job_id}` to purge artifacts (deferred).

## Internal Architecture

### Modules
- `app/main.py`: FastAPI application factory, routers, startup hooks.
- `app/api.py`: Route definitions & dependency wiring.
- `app/schemas.py`: Pydantic models (`JobCreateResponse`, `JobStatusResponse`, `JobError`).
- `app/jobs.py`: In-memory job registry, dataclass for job state, concurrency limits.
- `app/worker.py`: Background execution and stage progress updates.
- `app/storage.py`: Input/output path helpers, cleanup utilities.
- `app/config.py`: Settings via `pydantic-settings` (model choice, device, fast flag, file size limit, cleanup TTL, cors origins).

### Job Lifecycle
1. **Queued**: Persist upload under `tmp/jobs/{job_id}/input.pdf`; create job record.
2. **Validating**: Ensure PDF readability, handle `EncryptedPdfError`.
3. **Rendering**: Call `render_pdf`, update progress.
4. **Detecting**: Run detector (`extract_widgets`), wrap YOLO calls.
5. **Writing**: Write fillable PDF via `PyPdfFormCreator`.
6. **Ready**: Store output path, expose via download endpoint.
7. **Failed**: Capture exception info, clean partial outputs if necessary.

Progress steps align with stage boundaries (e.g., 0.1/0.3/0.6/0.9/1.0). Consider per-page granularity by instrumenting `render_pdf`/`extract_widgets` later.

### Background Execution
- Launch processing via `asyncio.create_task` or FastAPI `BackgroundTasks`.
- Guard with semaphore to cap concurrent inferences to avoid GPU/CPU overload.
- Job manager stores shared state (e.g., `dict[str, Job]`) protected by lock for thread safety.
- Design `JobWorker` interface so we can swap in Celery/Redis queue later.

### Storage Strategy
- Default base dir: `tmp/jobs/` (configurable).
- For each job:
  - `input.pdf`
  - `output.pdf`
  - optional metadata (`log.json`) for debugging.
- Periodic cleanup coroutine removes jobs older than TTL and deletes files.
- Support injection of S3/GCS backend by abstracting `StorageBackend` interface (future work).

## Error Handling
- Map known exceptions to user-friendly messages:
  - `EncryptedPdfError` → `failed` with guidance.
  - `FileNotFoundError`, `ValueError`, `formalpdf` parsing errors.
- Capture unexpected exceptions, log stack trace, return generic failure.
- Ensure file handles closed on failure and partial files deleted.

## Observability & Logging
- Structured logs per job id covering stage transitions and failures.
- Optional Prometheus metrics (`jobs_total`, `jobs_in_progress`, `job_duration_seconds`).
- Add tracing hooks later if required.

## Security Considerations
- Use UUIDv4 job ids; optionally append random secret suffix.
- Limit upload size and content-type; strip metadata to avoid path traversal.
- CORS configuration for expected clients; optional API key header for authenticated deployments.
- Sanitize temporary storage path and enforce permissions.

## Testing Strategy
- **Unit**: job manager state transitions, storage helpers, config defaults.
- **API**: use `fastapi.testclient` with monkeypatched `prepare_form` to simulate stages quickly.
- **Error cases**: encrypted PDF fixture should move job to `failed`; invalid MIME returns `422`.
- **Concurrency**: verify semaphore blocks when limit reached (simulate with sleep).
- **Cleanup**: test TTL removal by faking timestamps.
- **Integration (slow)**: run real `prepare_form` on tiny fixture to ensure end-to-end (flagged as `slow`).

## Open Questions
- Preferred concurrency limit default? (e.g., derive from CPU cores?)
- Should download endpoint require signed token beyond job id?
- Desired retention period for completed jobs (minutes vs hours)?
- Is Celery/RQ integration a near-term requirement, or is in-memory worker acceptable for MVP?
- Any requirement for notifying clients (webhooks) instead of polling?

## Next Steps
1. Confirm answers to open questions with stakeholders.
2. Finalize settings defaults (device, model, fast flag) and environment variable mapping.
3. Draft module skeletons and data models before wiring implementation.
4. Implement job manager + background worker with mocked `prepare_form` for initial tests.
5. Add FastAPI routes, integrate with job management, and write API tests.
6. Layer in cleanup task and optional observability features.
