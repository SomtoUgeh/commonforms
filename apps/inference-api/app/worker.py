from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Dict

import formalpdf
import pypdfium2

from commonforms.exceptions import EncryptedPdfError
from commonforms.form_creator import PyPdfFormCreator
from commonforms.inference import FFDNetDetector, render_pdf

from .config import settings
from .jobs import Job, JobStatus, QueueFullError
from .schemas import PrepareOptions
from .storage import JobPaths, StorageManager

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {JobStatus.READY, JobStatus.FAILED}


class JobManager:
    """In-memory job registry and dispatcher."""

    def __init__(
        self,
        storage: StorageManager,
        *,
        max_concurrent_jobs: int | None = None,
        queue_size: int | None = None,
    ) -> None:
        self.storage = storage
        self.max_concurrent_jobs = max(1, (max_concurrent_jobs or settings.max_concurrent_jobs))
        self.queue_size = queue_size or settings.queue_size
        self.jobs: Dict[str, Job] = {}
        self.tasks: Dict[str, asyncio.Task[None]] = {}
        self.lock = asyncio.Lock()
        self.semaphore = asyncio.Semaphore(self.max_concurrent_jobs)
        self.processor = JobProcessor(storage)

    async def submit_job(self, job_id: str, paths: JobPaths, options: PrepareOptions | None) -> Job:
        async with self.lock:
            if self.queue_size and self._active_job_count() >= self.queue_size:
                raise QueueFullError("Job queue is at capacity.")

            job = Job(job_id=job_id)
            job.metadata["options"] = options.model_dump(exclude_none=True) if options else {}
            self.jobs[job_id] = job
            task = asyncio.create_task(self._run_job(job, paths, options))
            self.tasks[job_id] = task
            task.add_done_callback(lambda _: self.tasks.pop(job_id, None))
            return job

    async def _run_job(self, job: Job, paths: JobPaths, options: PrepareOptions | None) -> None:
        try:
            async with self.semaphore:
                await self.processor.process(job, paths, options)
        except Exception as exc:  # noqa: BLE001
            if job.status is not JobStatus.FAILED:
                job.mark_failed(type(exc).__name__, str(exc))
            logger.exception("Job %s failed", job.job_id)
        finally:
            self._touch(paths.base_dir)

    def _active_job_count(self) -> int:
        return sum(1 for job in self.jobs.values() if job.status not in TERMINAL_STATUSES)

    async def get_job(self, job_id: str) -> Job | None:
        async with self.lock:
            return self.jobs.get(job_id)

    async def list_jobs(self) -> list[Job]:
        async with self.lock:
            return list(self.jobs.values())

    async def remove_job(self, job_id: str) -> None:
        async with self.lock:
            self.jobs.pop(job_id, None)
            task = self.tasks.pop(job_id, None)
            if task:
                task.cancel()

    async def shutdown(self) -> None:
        async with self.lock:
            tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                continue

    def _touch(self, path: Path) -> None:
        try:
            os.utime(path, None)
        except FileNotFoundError:
            path.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            logger.warning("Unable to update mtime for %s", path)


class JobProcessor:
    """Performs synchronous PDF processing inside background threads."""

    def __init__(self, storage: StorageManager) -> None:
        self.storage = storage

    async def process(
        self,
        job: Job,
        paths: JobPaths,
        options: PrepareOptions | None,
    ) -> None:
        await asyncio.to_thread(self._process_sync, job, paths, options)

    def _process_sync(
        self,
        job: Job,
        paths: JobPaths,
        options: PrepareOptions | None,
    ) -> None:
        self._touch(paths.base_dir)
        merged_options = self._merge_options(options)

        job.mark_stage(JobStatus.VALIDATING, "Validating input PDF")
        self._touch(paths.base_dir)
        self._validate_pdf(paths.input_path)

        job.mark_stage(JobStatus.RENDERING, "Rendering PDF pages")
        self._touch(paths.base_dir)
        try:
            pages = render_pdf(str(paths.input_path))
        except EncryptedPdfError as exc:
            job.mark_failed("EncryptedPdfError", str(exc) or "Encrypted PDF detected.")
            raise
        except pypdfium2._helpers.misc.PdfiumError as exc:  # type: ignore[attr-defined]
            job.mark_failed("PdfiumError", str(exc))
            raise

        job.mark_stage(JobStatus.DETECTING, "Running field detection")
        self._touch(paths.base_dir)
        detector = FFDNetDetector(
            merged_options["model_or_path"],
            device=merged_options["device"],
            fast=merged_options["fast"],
        )
        widgets = detector.extract_widgets(
            pages,
            confidence=merged_options["confidence"],
            image_size=merged_options["image_size"],
        )

        job.mark_stage(JobStatus.WRITING, "Writing fillable PDF")
        self._touch(paths.base_dir)
        writer = PyPdfFormCreator(str(paths.input_path))
        try:
            if not merged_options["keep_existing_fields"]:
                writer.clear_existing_fields()

            for page_ix, page_widgets in widgets.items():
                for i, widget in enumerate(page_widgets):
                    name = f"{widget.widget_type.lower()}_{widget.page}_{i}"
                    if widget.widget_type == "TextBox":
                        writer.add_text_box(name, page_ix, widget.bounding_box)
                    elif widget.widget_type == "ChoiceButton":
                        writer.add_checkbox(name, page_ix, widget.bounding_box)
                    elif widget.widget_type == "Signature":
                        if merged_options["use_signature_fields"]:
                            writer.add_signature(name, page_ix, widget.bounding_box)
                        else:
                            writer.add_text_box(name, page_ix, widget.bounding_box)

            writer.save(str(paths.output_path))
        finally:
            writer.close()

        job.mark_ready(paths.output_path, "PDF ready for download")
        self._touch(paths.base_dir)

    def _validate_pdf(self, pdf_path: Path) -> None:
        if not pdf_path.exists():
            raise FileNotFoundError(f"Uploaded PDF not found: {pdf_path}")
        if pdf_path.stat().st_size == 0:
            raise ValueError("Uploaded PDF is empty.")

        try:
            doc = formalpdf.open(pdf_path)
        except pypdfium2._helpers.misc.PdfiumError as exc:  # type: ignore[attr-defined]
            raise EncryptedPdfError from exc
        else:
            doc.document.close()

    def _merge_options(self, options: PrepareOptions | None) -> dict[str, object]:
        merged = {
            "model_or_path": settings.default_model,
            "device": settings.device,
            "fast": settings.fast_mode,
            "keep_existing_fields": settings.keep_existing_fields,
            "use_signature_fields": settings.use_signature_fields,
            "confidence": settings.confidence,
            "image_size": settings.image_size,
        }
        if options:
            for key, value in options.model_dump(exclude_none=True).items():
                merged[key] = value
        return merged

    def _touch(self, path: Path) -> None:
        try:
            os.utime(path, None)
        except FileNotFoundError:
            path.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            logger.warning("Unable to update mtime for %s", path)
