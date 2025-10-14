from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from fastapi.responses import FileResponse

import commonforms

app = FastAPI(title="CommonForms Inference API", version="0.0.1")

JOB_STORE = Path(".jobs")
JOB_STORE.mkdir(exist_ok=True)


def process_pdf(job_id: str, uploaded_path: Path) -> Path:
    output_path = JOB_STORE / f"{job_id}.pdf"
    commonforms.prepare_form(uploaded_path, output_path)
    return output_path


@app.post("/prepare")
async def queue_prepare(
    background_tasks: BackgroundTasks, pdf: UploadFile = File(...)
) -> dict[str, str]:
    job_id = uuid.uuid4().hex
    upload_path = JOB_STORE / f"{job_id}-input.pdf"

    content = await pdf.read()
    upload_path.write_bytes(content)

    background_tasks.add_task(process_pdf, job_id, upload_path)

    return {"job_id": job_id}


@app.get("/prepare/{job_id}")
async def fetch_status(job_id: str) -> dict[str, str] | FileResponse:
    output_path = JOB_STORE / f"{job_id}.pdf"
    if output_path.exists():
        return FileResponse(output_path, filename=f"commonforms-{job_id}.pdf")

    upload_path = JOB_STORE / f"{job_id}-input.pdf"
    if upload_path.exists():
        return {"job_id": job_id, "status": "processing"}

    return {"job_id": job_id, "status": "not_found"}
