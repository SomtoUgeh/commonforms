import { formatDistanceToNow } from "date-fns";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Format milliseconds to human-readable duration
 * Examples: "2.5s", "1m 30s", "5m 12s"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = seconds % SECONDS_PER_MINUTE;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return `${ms}ms`;
}

/**
 * Format ISO timestamp to relative time
 * Example: "2 minutes ago", "just now"
 */
export function formatRelativeTime(isoTimestamp: string): string {
  return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
}

/**
 * Format file size in bytes to human-readable format
 * Examples: "1.5 MB", "500 KB"
 */
export function formatFileSize(bytes: number): string {
  const KB = 1024;
  const MB = KB * KB;

  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  if (bytes >= KB) {
    return `${(bytes / KB).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Format progress percentage
 * Example: 0.456 → "46%"
 */
export function formatProgress(progress: number): string {
  const PERCENT = 100;
  return `${Math.round(progress * PERCENT)}%`;
}

/**
 * Estimate time remaining based on current progress and elapsed time
 * Returns null if progress is 0 or calculation would overflow
 */
export function estimateTimeRemaining(
  progress: number,
  elapsedMs: number
): number | null {
  const MIN_PROGRESS = 0.01; // 1% minimum to calculate
  const MAX_ESTIMATE_HOURS = 24;

  if (progress < MIN_PROGRESS) {
    return null;
  }

  const totalEstimatedMs = elapsedMs / progress;
  const remainingMs = totalEstimatedMs - elapsedMs;

  // Cap estimate at 24 hours to avoid absurd values
  const maxMs =
    MAX_ESTIMATE_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
  if (remainingMs > maxMs) {
    return null;
  }

  return remainingMs;
}
