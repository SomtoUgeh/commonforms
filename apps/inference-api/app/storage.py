from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import shutil

from .config import settings


@dataclass(slots=True)
class JobPaths:
    job_id: str
    base_dir: Path

    @property
    def input_path(self) -> Path:
        return self.base_dir / "input.pdf"

    @property
    def output_path(self) -> Path:
        return self.base_dir / "output.pdf"

    @property
    def metadata_path(self) -> Path:
        return self.base_dir / "metadata.json"


class StorageManager:
    """Filesystem helper for storing job artifacts."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = (base_dir or settings.job_storage_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def job_paths(self, job_id: str) -> JobPaths:
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return JobPaths(job_id=job_id, base_dir=job_dir)

    def delete_job(self, job_id: str) -> None:
        job_dir = self.base_dir / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)

    def cleanup_expired(self, ttl_seconds: int) -> list[str]:
        """Remove jobs older than the provided TTL. Returns deleted job ids."""
        cutoff = datetime.utcnow() - timedelta(seconds=ttl_seconds)
        removed: list[str] = []
        for job_dir in self.base_dir.iterdir():
            if not job_dir.is_dir():
                continue
            try:
                mtime = datetime.utcfromtimestamp(job_dir.stat().st_mtime)
            except OSError:
                continue
            if mtime < cutoff:
                shutil.rmtree(job_dir, ignore_errors=True)
                removed.append(job_dir.name)
        return removed


storage = StorageManager()
