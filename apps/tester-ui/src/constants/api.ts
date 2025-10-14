/**
 * API configuration and timing constants
 */

// Polling configuration
export const POLL_INTERVAL_MS = 2000; // 2s - adequate for ~25s jobs with fast mode
export const MAX_POLL_DURATION_MS = 600_000; // 10 minutes max poll time
export const POLL_RETRY_LIMIT = 3; // Retry failed polls

// HTTP timeouts
export const UPLOAD_TIMEOUT_MS = 60_000; // 60s for large PDF uploads
export const STATUS_TIMEOUT_MS = 10_000; // 10s for status checks
export const DOWNLOAD_TIMEOUT_MS = 30_000; // 30s for result downloads

// Retry configuration
export const HTTP_RETRY_COUNT = 3;
export const HTTP_RETRY_DELAY_MS = 1000; // Initial delay, exponential backoff

// API defaults
export const DEFAULT_BACKEND_URL = "http://localhost:8000";
