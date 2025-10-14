/**
 * File upload validation rules
 */

// File size limits
export const MAX_FILE_SIZE_BYTES = 52_428_800; // 50 MB
export const MAX_FILE_SIZE_MB = 50;

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
