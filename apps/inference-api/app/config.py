from __future__ import annotations

from pathlib import Path
from typing import List
import tempfile

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the inference API."""

    model_config = SettingsConfigDict(
        env_prefix="COMMONFORMS_",
        case_sensitive=False,
    )

    job_storage_dir: Path = Path(tempfile.gettempdir()) / "commonforms_jobs"
    default_model: str = "FFDNet-L"
    device: str | int = "cpu"
    fast_mode: bool = False
    keep_existing_fields: bool = False
    use_signature_fields: bool = False
    confidence: float = 0.3
    image_size: int = 1600
    max_concurrent_jobs: int = 2
    queue_size: int = 100
    cleanup_ttl_seconds: int = 3600
    cleanup_interval_seconds: int = 600
    cors_origins: List[str] = Field(default_factory=list)
    base_download_url: str | None = None
    max_upload_mb: int = 20


settings = Settings()
