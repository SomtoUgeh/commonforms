import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  PDF_FILE_EXTENSION,
  VALIDATION_MESSAGES,
} from "@/constants/validation";

/**
 * Validation error type
 */
export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validate PDF file for upload
 * Returns null if valid, error message if invalid
 */
export function validatePdfFile(file: File | null): string | null {
  if (!file) {
    return VALIDATION_MESSAGES.FILE_REQUIRED;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return VALIDATION_MESSAGES.FILE_TOO_LARGE;
  }

  // Check MIME type
  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number]
    )
  ) {
    // Also check file extension as fallback
    if (!file.name.toLowerCase().endsWith(PDF_FILE_EXTENSION)) {
      return VALIDATION_MESSAGES.INVALID_FILE_TYPE;
    }
  }

  return null;
}

/**
 * Validate backend URL format
 */
export function validateBackendUrl(url: string): string | null {
  if (!url.trim()) {
    return "Backend URL is required";
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "URL must use http:// or https://";
    }
    return null;
  } catch {
    return "Invalid URL format";
  }
}

/**
 * Validate poll interval (in milliseconds)
 */
export function validatePollInterval(intervalMs: number): string | null {
  const MIN_INTERVAL_MS = 500;
  const MAX_INTERVAL_MS = 30_000;

  if (intervalMs < MIN_INTERVAL_MS) {
    return `Poll interval must be at least ${MIN_INTERVAL_MS}ms`;
  }
  if (intervalMs > MAX_INTERVAL_MS) {
    return `Poll interval cannot exceed ${MAX_INTERVAL_MS}ms`;
  }
  return null;
}

// PDF magic bytes constants (%PDF)
const PDF_HEADER_SIZE = 4;
const PDF_MAGIC_BYTE_1 = 0x25; // %
const PDF_MAGIC_BYTE_2 = 0x50; // P
const PDF_MAGIC_BYTE_3 = 0x44; // D
const PDF_MAGIC_BYTE_4 = 0x46; // F

/**
 * Check if file is a valid PDF based on magic bytes
 * Note: This requires reading the file, so it's async
 */
export async function isPdfByMagicBytes(file: File): Promise<boolean> {
  const PDF_MAGIC_BYTES = [
    PDF_MAGIC_BYTE_1,
    PDF_MAGIC_BYTE_2,
    PDF_MAGIC_BYTE_3,
    PDF_MAGIC_BYTE_4,
  ];

  try {
    const headerBuffer = await file.slice(0, PDF_HEADER_SIZE).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);

    return PDF_MAGIC_BYTES.every((byte, index) => headerBytes[index] === byte);
  } catch {
    return false;
  }
}
