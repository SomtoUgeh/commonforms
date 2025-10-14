# Monorepo Overview

This repository now uses [Turborepo](https://turbo.build/repo/docs) to orchestrate builds across JavaScript/TypeScript apps and the existing Python package.

```
apps/
  chrome-extension/   # React + Vite Chrome extension (MV3)
  inference-api/      # FastAPI service queueing CommonForms jobs
commonforms/          # Python package with YOLO-based PDF conversion
tests/                # Python pytest suite for the package
```

## Turborepo Commands

Run tasks from the repository root:

- `npm run dev` – parallel dev tasks (e.g., `vite` dev server once configured).
- `npm run build` – build all projects, respecting dependency graph.
- `npm run lint` / `npm run test` – fan out lint and test pipelines.

Turborepo auto-detects tasks defined in each workspace (`package.json` for JS/TS, `package.json` + custom scripts for future tooling). Extend `turbo.json` when adding new steps (e.g., `format`, `e2e`).

## Sharing Code

Place shared TypeScript utilities under `packages/` (e.g., `packages/ui`, `packages/config`). Keep Python packages either in `packages/` or reuse the top-level `commonforms` folder until we migrate fully. Use the `workspaces` entry in `package.json` to expose new packages to the toolchain.

## Python & JS Interaction

The inference API imports the local `commonforms` package. In development, install it in editable mode (`uv pip install -e ../../commonforms`). When packaging, publish `commonforms` to PyPI or build internal wheels so the API can depend on a pinned version.

## Roadmap Ideas

- Define an OpenAPI schema shared between the API and extension via codegen.
- Add CI jobs that run `turbo run test --filter=chrome-extension` and `uv run pytest`.
- Introduce infrastructure manifests (`infra/`) as the deployment picture solidifies.
