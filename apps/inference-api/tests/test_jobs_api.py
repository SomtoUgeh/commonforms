from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]
APP_PACKAGE_ROOT = REPO_ROOT / "apps" / "inference-api"
CORE_PACKAGE_ROOT = REPO_ROOT / "packages" / "commonforms-core"

for path in (APP_PACKAGE_ROOT, CORE_PACKAGE_ROOT):
    sys.path.insert(0, str(path))

from app import main  # noqa: E402
from app.jobs import JobStatus  # noqa: E402
from commonforms.exceptions import EncryptedPdfError  # noqa: E402

RESOURCES = CORE_PACKAGE_ROOT / "tests" / "resources"


@pytest.fixture(autouse=True)
def isolate_settings(tmp_path, monkeypatch):
    asyncio.run(main.job_manager.shutdown())
    main.job_manager.jobs.clear()
    main.job_manager.tasks.clear()

    monkeypatch.setattr(main.storage, "base_dir", tmp_path, raising=False)
    tmp_path.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(main.settings, "cleanup_ttl_seconds", 0, raising=False)
    monkeypatch.setattr(main.settings, "cleanup_interval_seconds", 60, raising=False)
    monkeypatch.setattr(main.settings, "max_upload_mb", 5, raising=False)
    yield


@pytest.fixture
def client():
    with TestClient(main.app) as fastapi_client:
        yield fastapi_client


def _stub_success(self, job, paths, options):
    job.mark_stage(JobStatus.VALIDATING, "Validating input PDF")
    output = paths.output_path
    output.write_bytes(b"%PDF-1.4\n% Fake document for testing\n")
    job.mark_ready(output, "PDF ready")


def _stub_failure(self, job, paths, options):
    job.mark_stage(JobStatus.VALIDATING, "Validating input PDF")
    raise EncryptedPdfError("encrypted")


def _stub_slow(self, job, paths, options):
    job.mark_stage(JobStatus.VALIDATING, "Validating input PDF")
    time.sleep(0.2)
    output = paths.output_path
    output.write_bytes(b"%PDF-1.4\n% slow test\n")
    job.mark_ready(output, "Done")


def test_create_job_success(monkeypatch, client):
    monkeypatch.setattr(
        main.job_manager.processor,
        "_process_sync",
        _stub_success,
        raising=False,
    )
    with (RESOURCES / "input.pdf").open("rb") as handle:
        response = client.post(
            "/jobs",
            files={"file": ("input.pdf", handle, "application/pdf")},
        )
    assert response.status_code == 202
    payload = response.json()
    job_id = payload["job_id"]
    assert payload["status"] == JobStatus.QUEUED

    for _ in range(20):
        status_response = client.get(f"/jobs/{job_id}")
        data = status_response.json()
        if data["status"] == JobStatus.READY:
            break
        time.sleep(0.05)
    else:
        pytest.fail("Job did not complete in time")

    download_url = data["download_url"]
    assert download_url

    result = client.get(download_url)
    assert result.status_code == 200
    assert result.headers["content-type"] == "application/pdf"
    assert result.content.startswith(b"%PDF-1.4")


def test_non_pdf_rejected(client):
    response = client.post(
        "/jobs",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415


def test_encrypted_pdf_marks_failure(monkeypatch, client):
    monkeypatch.setattr(
        main.job_manager.processor,
        "_process_sync",
        _stub_failure,
        raising=False,
    )
    with (RESOURCES / "encrypted.pdf").open("rb") as handle:
        response = client.post(
            "/jobs",
            files={"file": ("encrypted.pdf", handle, "application/pdf")},
        )
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    for _ in range(20):
        status_response = client.get(f"/jobs/{job_id}")
        data = status_response.json()
        if data["status"] == JobStatus.FAILED:
            break
        time.sleep(0.05)
    else:
        pytest.fail("Job did not fail as expected")

    assert data["error"]["type"] == "EncryptedPdfError"


def test_queue_capacity(monkeypatch, client):
    original_queue_size = main.job_manager.queue_size
    monkeypatch.setattr(main.job_manager.processor, "_process_sync", _stub_slow, raising=False)
    try:
        main.job_manager.queue_size = 1

        with (RESOURCES / "input.pdf").open("rb") as handle:
            first = client.post(
                "/jobs",
                files={"file": ("input.pdf", handle, "application/pdf")},
            )
        assert first.status_code == 202

        with (RESOURCES / "input.pdf").open("rb") as handle:
            second = client.post(
                "/jobs",
                files={"file": ("input.pdf", handle, "application/pdf")},
            )
        assert second.status_code == 503

        job_id = first.json()["job_id"]
        for _ in range(40):
            status_response = client.get(f"/jobs/{job_id}")
            if status_response.json()["status"] == JobStatus.READY:
                break
            time.sleep(0.05)
    finally:
        main.job_manager.queue_size = original_queue_size
