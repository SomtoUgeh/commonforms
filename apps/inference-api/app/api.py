from __future__ import annotations

import logging
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import ValidationError

from .config import settings
from .jobs import Job, JobStatus, QueueFullError
from .schemas import JobCreateResponse, JobErrorModel, JobStatusResponse, PrepareOptions
from .storage import JobPaths, storage
from .worker import JobManager

logger = logging.getLogger(__name__)

PDF_MIME_TYPES = {"application/pdf", "application/x-pdf"}
CHUNK_SIZE = 1 << 20  # 1 MiB


def create_router(job_manager: JobManager) -> APIRouter:
    router = APIRouter()

    @router.post(
        "/jobs",
        response_model=JobCreateResponse,
        status_code=status.HTTP_202_ACCEPTED,
    )
    async def create_job(
        file: UploadFile = File(...),
        options: Annotated[str | None, Form()] = None,
    ) -> JobCreateResponse:
        if file.content_type and file.content_type.lower() not in PDF_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Only PDF uploads are supported.",
            )

        parsed_options = _parse_options(options)
        job_id = uuid4().hex
        paths = storage.job_paths(job_id)

        try:
            try:
                await _persist_upload(file, paths)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=str(exc),
                ) from exc
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to persist upload for job %s", job_id)
                storage.delete_job(job_id)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Unable to store uploaded file.",
                ) from exc

            try:
                job = await job_manager.submit_job(job_id, paths, parsed_options)
            except QueueFullError as exc:
                storage.delete_job(job_id)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                ) from exc
        finally:
            await file.close()

        return _job_create_response(job)

    @router.get(
        "/jobs/{job_id}",
        response_model=JobStatusResponse,
    )
    async def get_job(job_id: str) -> JobStatusResponse:
        job = await job_manager.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return _job_status_response(job)

    @router.get("/jobs/{job_id}/result")
    async def download_result(job_id: str):
        job = await job_manager.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        if job.status != JobStatus.READY or not job.output_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not ready.")
        if not job.output_path.exists():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Generated PDF has expired.",
            )
        return FileResponse(
            path=job.output_path,
            media_type="application/pdf",
            filename=f"{job.job_id}.pdf",
        )

    return router


def _parse_options(raw_options: str | None) -> PrepareOptions | None:
    if raw_options is None:
        return None

    try:
        return PrepareOptions.model_validate_json(raw_options)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc


async def _persist_upload(upload: UploadFile, paths: JobPaths) -> None:
    max_bytes = settings.max_upload_mb * 1_048_576
    total = 0

    with paths.input_path.open("wb") as buffer:
        while True:
            chunk = await upload.read(CHUNK_SIZE)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                buffer.close()
                paths.input_path.unlink(missing_ok=True)
                raise ValueError("Uploaded file exceeds size limit.")
            buffer.write(chunk)

    await upload.close()


def _job_create_response(job: Job) -> JobCreateResponse:
    return JobCreateResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
    )


def _job_status_response(job: Job) -> JobStatusResponse:
    error = JobErrorModel(type=job.error.error_type, detail=job.error.detail) if job.error else None
    download_url = None
    if job.status == JobStatus.READY and job.output_path:
        download_url = _build_download_url(job.job_id)

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        message=job.message,
        error=error,
        download_url=download_url,
    )


def _build_download_url(job_id: str) -> str:
    if settings.base_download_url:
        base = settings.base_download_url.rstrip("/")
        return f"{base}/jobs/{job_id}/result"
    return f"/jobs/{job_id}/result"
