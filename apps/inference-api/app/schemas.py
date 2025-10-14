from __future__ import annotations

from pydantic import BaseModel, Field

from .jobs import JobStatus


class JobErrorModel(BaseModel):
    type: str = Field(..., description="Machine-readable error type.")
    detail: str | None = Field(None, description="Human-readable error description for clients.")


class JobResponseBase(BaseModel):
    job_id: str = Field(..., description="Server-generated job identifier.")
    status: JobStatus = Field(..., description="Current job status.")
    progress: float = Field(
        ..., ge=0.0, le=1.0, description="Fraction of work completed in the range [0,1]."
    )


class JobCreateResponse(JobResponseBase):
    """Response returned when a job is enqueued."""


class JobStatusResponse(JobResponseBase):
    message: str | None = Field(None, description="Optional human-readable progress message.")
    error: JobErrorModel | None = Field(None, description="Error metadata when the job fails.")
    download_url: str | None = Field(
        None,
        description="URL to download the generated PDF when the job is ready.",
    )


class PrepareOptions(BaseModel):
    model_or_path: str | None = Field(
        None, description="Optional override for the detector weights path."
    )
    device: str | int | None = Field(None, description="Target device for inference (cpu/cuda/0).")
    fast: bool | None = Field(None, description="Enable fast mode / ONNX inference.")
    keep_existing_fields: bool | None = Field(
        None, description="Retain original PDF fields when generating output."
    )
    use_signature_fields: bool | None = Field(
        None, description="Prefer signature widgets for detected signatures."
    )
    confidence: float | None = Field(
        None, ge=0.0, le=1.0, description="Detection confidence threshold."
    )
    image_size: int | None = Field(None, gt=0, description="Image size to use during inference.")

    class Config:
        extra = "forbid"
