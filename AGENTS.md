# Repository Guidelines

## Project Structure & Module Organization
- `commonforms/` hosts the pip package and CLI entry point `__main__.py`; detectors live in `inference.py` and PDF writing in `form_creator.py`.
- YOLO weights reside under `commonforms/models/` and load dynamically according to CLI flags.
- Tests sit in `tests/`, with CLI and API coverage in `tests/inference_test.py` and fixtures under `tests/resources/`.
- Documentation assets live in `assets/`, while packaging and metadata are defined in `pyproject.toml`.

## Build, Test, and Development Commands
- `uv pip install -e .[dev]` (or `pip install -e .[dev]`) installs the package plus lint/test tooling.
- `pytest` runs the full suite; call `pytest tests/test_module.py::test_case` to target a single test.
- `ruff check commonforms tests` enforces linting; run `ruff --fix` for autofixes when appropriate.
- `commonforms ./tests/resources/input.pdf ./tmp/output.pdf` verifies end-to-end generation; create `tmp/` locally for throwaway artifacts.

## Coding Style & Naming Conventions
- Follow 4-space indentation, full type hints, and snake_case modules/functions to mirror existing code.
- Keep public helpers documented; model new docstrings on `commonforms.inference.FFDNetDetector`.
- Prefer expressive exceptions declared in `commonforms/exceptions.py`.
- Run `ruff` before committing; keep generated files out of version control.

## Testing Guidelines
- Use `pytest` with tests named `test_*` in files ending `_test.py`.
- Rely on fixtures such as `tmp_path` for temporary PDFs and reuse `tests/resources/` inputs where feasible.
- Cover both default and `--fast` inference paths; encrypted inputs must raise `EncryptedPdfError`.
- Run `pytest -q` locally prior to opening a PR and add new resources under `tests/resources/`.

## Commit & Pull Request Guidelines
- Craft concise, imperative commit messages (e.g., `Catch encrypted PDFs`); reference issues with `#<id>` when relevant.
- PRs should explain motivation, summarize changes, call out inference performance impacts, and confirm lint/tests.
- Attach CLI output or refreshed screenshots when behavior alters generated PDFs; note any follow-up tasks or TODOs.

## Model & Asset Handling
- Avoid committing new binaries; discuss large weights before adding them and prefer lazy downloads when possible.
- Keep generated PDFs in `tmp/` or ignore them via `.gitignore`; only ship documentation assets that the README references.
