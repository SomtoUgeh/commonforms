from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Any


class JobStatus(StrEnum):
    QUEUED = "queued"
    VALIDATING = "validating"
    RENDERING = "rendering"
    DETECTING = "detecting"
    WRITING = "writing"
    READY = "ready"
    FAILED = "failed"


STAGE_PROGRESS: dict[JobStatus, float] = {
    JobStatus.QUEUED: 0.0,
    JobStatus.VALIDATING: 0.1,
    JobStatus.RENDERING: 0.3,
    JobStatus.DETECTING: 0.6,
    JobStatus.WRITING: 0.9,
    JobStatus.READY: 1.0,
    JobStatus.FAILED: 1.0,
}


class QueueFullError(RuntimeError):
    """Raised when the job queue is at capacity."""


@dataclass(slots=True)
class JobError:
    error_type: str
    detail: str | None = None


@dataclass(slots=True)
class Job:
    job_id: str
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0
    message: str | None = None
    error: JobError | None = None
    output_path: Path | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

    def update(
        self,
        *,
        status: JobStatus | None = None,
        progress: float | None = None,
        message: str | None = None,
    ) -> None:
        if status is not None:
            self.status = status
        if progress is not None:
            self.progress = max(0.0, min(progress, 1.0))
        if message is not None:
            self.message = message
        self.updated_at = datetime.utcnow()

    def mark_stage(self, stage: JobStatus, message: str | None = None) -> None:
        self.update(status=stage, message=message)

    def mark_ready(self, output_path: Path, message: str | None = None) -> None:
        self.output_path = output_path
        self.update(status=JobStatus.READY, message=message, progress=1.0)

    def mark_failed(
        self, error_type: str, detail: str | None = None, message: str | None = None
    ) -> None:
        self.error = JobError(error_type, detail)
        self.update(status=JobStatus.FAILED, progress=1.0, message=message)

    def advance_stage(self, stage: JobStatus, fraction: float) -> None:
        start = self._stage_start(stage)
        end = STAGE_PROGRESS.get(stage, start)
        clamped_fraction = max(0.0, min(fraction, 1.0))
        progress = start + (end - start) * clamped_fraction
        self.update(progress=progress)

    def complete_stage(self, stage: JobStatus) -> None:
        self.update(progress=STAGE_PROGRESS.get(stage, self.progress))

    def _stage_start(self, stage: JobStatus) -> float:
        ordered = [
            JobStatus.QUEUED,
            JobStatus.VALIDATING,
            JobStatus.RENDERING,
            JobStatus.DETECTING,
            JobStatus.WRITING,
            JobStatus.READY,
            JobStatus.FAILED,
        ]
        try:
            idx = ordered.index(stage)
        except ValueError:
            return self.progress
        if idx == 0:
            return 0.0
        previous = ordered[idx - 1]
        return STAGE_PROGRESS.get(previous, self.progress)
