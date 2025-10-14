from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import create_router
from .config import settings
from .jobs import JobStatus
from .storage import storage
from .worker import JobManager

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {JobStatus.READY, JobStatus.FAILED}


job_manager = JobManager(storage)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task: asyncio.Task[None] | None = None
    try:
        if settings.cleanup_ttl_seconds > 0:
            cleanup_task = asyncio.create_task(_cleanup_loop())
        yield
    finally:
        if cleanup_task:
            cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup_task
        await job_manager.shutdown()


app = FastAPI(
    title="CommonForms Inference API",
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

app.include_router(create_router(job_manager))


async def _cleanup_loop() -> None:
    ttl = settings.cleanup_ttl_seconds
    interval = max(5, settings.cleanup_interval_seconds)
    while True:
        await asyncio.sleep(interval)
        cutoff = datetime.utcnow() - timedelta(seconds=ttl)
        jobs = await job_manager.list_jobs()
        for job in jobs:
            if job.status not in TERMINAL_STATUSES:
                continue
            if job.updated_at >= cutoff:
                continue
            storage.delete_job(job.job_id)
            await job_manager.remove_job(job.job_id)
            logger.info("Cleaned up job %s", job.job_id)
