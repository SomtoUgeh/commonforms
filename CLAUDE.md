# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CommonForms is a monorepo containing:
- **Core Library** (`packages/commonforms-core`): Python package for PDF form field detection using YOLO
- **FastAPI Backend** (`apps/inference-api`): REST API service for processing PDFs
- **Chrome Extension** (`apps/chrome-extension`): Browser extension for converting PDFs

The core library includes:
- CLI tool (`commonforms`) and Python API (`prepare_form()`)
- Two pre-trained models: FFDNet-S (small, 19MB) and FFDNet-L (large, 51MB)
- ONNX versions for fast CPU inference (--fast flag)
- Support for detecting three widget types: TextBox, ChoiceButton, Signature

## Monorepo Structure

```
commonforms/
├── packages/
│   └── commonforms-core/         # Core Python library
│       ├── commonforms/          # Source code
│       ├── tests/                # Test suite
│       └── pyproject.toml        # Package config
├── apps/
│   ├── inference-api/            # FastAPI service
│   │   ├── app/                  # API source
│   │   └── pyproject.toml        # API config (depends on core via workspace)
│   └── chrome-extension/         # React + Vite 7 extension
│       ├── src/                  # Extension source
│       ├── vite.config.ts        # Vite 7 config
│       └── package.json          # Extension deps
├── docs/                         # Documentation & test PDFs
├── package.json                  # Root (Bun 1.3 + Turborepo 2.5.8)
├── turbo.json                    # Turborepo config
├── bunfig.toml                   # Bun config
├── pyproject.toml                # Root (uv workspace)
└── uv.lock                       # Python lockfile
```

## Technology Stack

- **JS/TS**: Bun 1.3, Turborepo 2.5.8, Vite 7.1.9, React 18.3.1, TypeScript 5.7.2
- **Python**: uv workspaces, FastAPI 0.115.6+, Uvicorn 0.34.0+
- **Chrome Extension**: @crxjs/vite-plugin 2.0.0-beta.25 (Vite 7 compatible)
- **Linting/Formatting**: Ultracite 5.6.2 + Biome 2.2.5 (TypeScript/JavaScript)
- **Requirements**: Node.js 20.19+ or 22.12+ (for Vite 7)

## TypeScript/JavaScript Linting & Formatting

**Ultracite** - Zero-config linting and formatting built on Biome (Rust-based, 10-100x faster than ESLint)

### Commands
```bash
# Auto-fix formatting and lint issues
bun run format

# Check without fixing
bun run format:check

# Full lint (format check + typecheck)
bun run lint
```

### Editor Setup
1. Install Biome VS Code extension: `code --install-extension biomejs.biome`
2. Extension provides format-on-save and auto-organize imports
3. Settings configured in `.vscode/settings.json`

### Configuration
- **Root config**: `biome.jsonc` extends `ultracite` preset
- **Customizations**: Chrome extension globals (`chrome`), console warnings
- **Pre-commit**: Husky runs `bunx ultracite fix` on staged files

### Key Features
- 300+ preconfigured rules (opinionated but customizable)
- AI-ready code consistency
- Monorepo-native (single config for entire workspace)
- Lightning-fast performance (Rust-based)

## Development Commands

### Monorepo Setup
```bash
# Install all dependencies (JS + Python)
bun install     # Installs Turborepo and JS deps
uv sync         # Resolves Python workspace deps

# Build all packages
bun run build   # Runs Turborepo tasks

# Clean all build artifacts
bun run clean
```

### Core Library (packages/commonforms-core)
```bash
# Run all tests (from repo root)
cd packages/commonforms-core && python -m pytest

# Run specific test
cd packages/commonforms-core && python -m pytest tests/inference_test.py::test_inference

# Run linting/formatting
cd packages/commonforms-core && ruff check --fix
cd packages/commonforms-core && ruff format

# Install for development (if working outside monorepo)
cd packages/commonforms-core && uv pip install -e ".[dev]"

# Run CLI from source
cd packages/commonforms-core && python -m commonforms input.pdf output.pdf --fast
```

### FastAPI Backend (apps/inference-api)
```bash
# Run development server
cd apps/inference-api && uvicorn app.main:app --reload

# Run tests
cd apps/inference-api && python -m pytest

# Lint
cd apps/inference-api && ruff check --fix
```

### Chrome Extension (apps/chrome-extension)
```bash
# Development mode (auto-reload)
cd apps/chrome-extension && bun run dev

# Build for production
cd apps/chrome-extension && bun run build

# Type check
cd apps/chrome-extension && bun run lint
```

### CLI Usage (after installation)
```bash
# Basic usage
commonforms input.pdf output.pdf

# With custom model and device
commonforms input.pdf output.pdf --model FFDNet-S --device cuda

# Fast mode (uses ONNX, ~2x speedup on CPU)
commonforms input.pdf output.pdf --fast
```

## Architecture

### Core Components (packages/commonforms-core/commonforms/)

**inference.py** - Main entry point
- `FFDNetDetector`: Wrapper around YOLO model for form field detection
  - `get_model_path()`: Resolves model name to .pt or .onnx file path
  - `extract_widgets()`: Runs inference on rendered PDF pages, returns detected widgets
- `render_pdf()`: Uses formalpdf to render PDF pages to PIL images
- `prepare_form()`: Main API function orchestrating detection and form creation
- `sort_widgets()`: Sorts detected widgets into reading order (left-to-right, top-to-bottom) for proper tab navigation

**form_creator.py** - PDF manipulation using pypdf
- `PyPdfFormCreator`: Creates form fields from detected bounding boxes
  - `add_text_box()`, `add_checkbox()`, `add_signature()`: Add different field types
  - `clear_existing_fields()`: Removes existing form fields from input PDF
  - `rect_for()`: Converts normalized bounding boxes to PDF coordinate system (handles CropBox vs MediaBox)
- Custom annotation classes: `Textbox`, `Checkbox`, `Signature` (subclass pypdf's AnnotationDictionary)

**utils.py** - Data models
- `BoundingBox`: Normalized coordinates (x0, y0, x1, y1) with `from_yolo()` converter
- `Widget`: Detected form field with type, bounding box, and page number
- `Page`: Container for rendered PDF page (PIL image + dimensions)

### Key Design Patterns

1. **Coordinate Systems**: Pipeline uses normalized coordinates (0-1 range) throughout detection, converts to PDF coordinates only when creating annotations
2. **Model Loading**: Supports both bundled models (FFDNet-S/L) and custom .pt files; --fast flag switches to ONNX for CPU speedup
3. **Widget Sorting**: Detection results sorted by y-coordinate then x-coordinate to ensure logical tab order
4. **PDF Rendering**: Uses formalpdf (built on pypdfium2) for rendering; uses CropBox when available, falls back to MediaBox
5. **Lazy Loading**: PyPdfFormCreator keeps PdfReader open until save() to avoid pypdf lazy loading issues

### Dependencies

- **ultralytics**: YOLO model inference
- **pypdf**: PDF manipulation and form field creation
- **formalpdf**: PDF rendering (wraps pypdfium2)
- **onnx/onnxruntime**: Fast CPU inference mode
- **pydantic**: Data validation for BoundingBox and Widget models

### Error Handling

- `EncryptedPdfError`: Raised when input PDF is encrypted (password-protected PDFs not yet supported - see packages/commonforms-core/tests/inference_test.py:41-44 for TODO)
- pypdfium2.PdfiumError caught and converted to EncryptedPdfError in packages/commonforms-core/commonforms/inference.py:166

### Testing Notes

- Tests use `tmp_path` fixture for output files
- Test resources in packages/commonforms-core/tests/resources/ include input.pdf and encrypted.pdf
- Tests verify both standard and fast (ONNX) inference modes
- Tests should be run from packages/commonforms-core/ directory: `cd packages/commonforms-core && python -m pytest`
- Critical test: EPA.pdf processing should detect ~288 textboxes and ~43 choice buttons
