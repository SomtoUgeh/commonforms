# Repository Guidelines

## Project Structure & Module Organization
- `commonforms/` houses the pip package and CLI entry point (`__main__.py`), with `inference.py` wrapping YOLO detectors and `form_creator.py` handling output PDFs. Model weights live under `commonforms/models/` and load dynamically based on CLI flags.
- `tests/` contains pytest suites; `tests/inference_test.py` exercises the public API and CLI, relying on PDFs in `tests/resources/`.
- `assets/` stores documentation images referenced in the README. Packaging metadata lives in `pyproject.toml` (Python 3.11+).

## Build, Test, and Development Commands
- `uv pip install -e .[dev]` (or `pip install -e .[dev]`) installs the package with lint and test deps.
- `pytest` runs the test suite; use `pytest tests/test_module.py::test_case` when narrowing failures.
- `ruff check commonforms tests` enforces formatting and linting; run `ruff --fix` for minor tidy-ups.
- `commonforms ./tests/resources/input.pdf ./tmp/output.pdf` or `python -m commonforms ...` performs an end-to-end smoke check.

## Coding Style & Naming Conventions
Use 4-space indentation, type-annotated functions, and snake_case module and function names to match existing modules. Keep public helpers documented with concise docstrings (see `commonforms.inference.FFDNetDetector`). Prefer descriptive exceptions in `commonforms/exceptions.py`, and keep CLI options mirrored between `__main__.py` and the API.

## Testing Guidelines
Add pytest cases under `tests/`, naming files `*_test.py` and tests `test_*`. Reuse fixtures such as `tmp_path` for generated PDFs and store new assets under `tests/resources/`. Cover both standard and `--fast` execution paths when touching inference or model-loading logic; ensure encrypted inputs raise `EncryptedPdfError`. Run `pytest -q` before opening a PR.

## Commit & Pull Request Guidelines
Commits should be concise, sentence-case summaries in the imperative (e.g., `Catch encrypted PDFs`). Reference issues with `#<id>` when applicable. PRs must describe the motivation, outline solution changes, note impacts on inference speed or accuracy, and confirm tests/lint have run. Include sample CLI output or updated screenshots if behavior changes the generated PDFs.

## Model & Asset Handling
Large weight files already ship in `commonforms/models/`; avoid committing new binaries without discussing alternatives (external hosting or lazy download). Keep generated PDFs out of version control—store them in `tmp/` or reference paths in the PR instead.
