/**
 * File upload validation rules
 */

// File size limits (default matches backend default limit)
const DEFAULT_MAX_FILE_SIZE_MB = 20;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

const envMaxMb = Number(
  import.meta.env.VITE_MAX_UPLOAD_MB ?? DEFAULT_MAX_FILE_SIZE_MB
);
export const MAX_FILE_SIZE_MB =
  Number.isFinite(envMaxMb) && envMaxMb > 0
    ? envMaxMb
    : DEFAULT_MAX_FILE_SIZE_MB;
export const MAX_FILE_SIZE_BYTES = Math.round(MAX_FILE_SIZE_MB * BYTES_PER_MB);

// MIME types
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/x-pdf",
] as const;

export const PDF_FILE_EXTENSION = ".pdf";

// Validation messages
export const VALIDATION_MESSAGES = {
  FILE_TOO_LARGE: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
  INVALID_FILE_TYPE: "Only PDF files are supported",
  FILE_REQUIRED: "Please select a PDF file to upload",
} as const;
