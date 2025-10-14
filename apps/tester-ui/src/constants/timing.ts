/**
 * Job lifecycle timing expectations
 */

// Backend TTL (sync with COMMONFORMS_CLEANUP_TTL_SECONDS)
export const JOB_TTL_SECONDS = 3600; // 1 hour
const MS_PER_SECOND = 1000;
export const JOB_TTL_MS = JOB_TTL_SECONDS * MS_PER_SECOND;

// Expected durations (based on EPA.pdf testing)
export const EXPECTED_DURATION = {
  FAST_MODE: 25_000, // ~25s with ONNX
  REGULAR_MODE: 360_000, // ~6min with PyTorch (not recommended)
  PER_PAGE_FAST: 1000, // ~1s per page
  PER_PAGE_REGULAR: 12_000, // ~12s per page
} as const;

// Stage transition expectations
export const STAGE_COUNT = 7; // queued → validating → rendering → detecting → writing → ready
export const MIN_STAGE_DURATION_MS = 100; // Minimum time to show each stage

// UI timing
export const DEBOUNCE_SETTINGS_MS = 500; // Debounce settings changes
export const TOAST_DURATION_MS = 5000; // Toast notification duration
export const PROGRESS_ANIMATION_MS = 300; // Progress bar transition
