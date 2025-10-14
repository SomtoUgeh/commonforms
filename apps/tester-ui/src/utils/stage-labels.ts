import type { JobStatus } from "@/lib/api/schemas";

/**
 * Human-readable labels for job processing stages
 */
export const STAGE_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  validating: "Validating PDF",
  rendering: "Rendering pages",
  detecting: "Detecting form fields",
  writing: "Writing form fields",
  ready: "Ready",
  failed: "Failed",
};

/**
 * Get user-friendly stage description
 */
export function getStageLabel(status: JobStatus): string {
  return STAGE_LABELS[status];
}

/**
 * Get detailed stage description for tooltips/help text
 */
export function getStageDescription(status: JobStatus): string {
  switch (status) {
    case "queued":
      return "Job is waiting in queue to be processed";
    case "validating":
      return "Checking PDF format and extracting metadata";
    case "rendering":
      return "Converting PDF pages to images for analysis";
    case "detecting":
      return "Using ML model to detect form field locations";
    case "writing":
      return "Creating interactive form fields in PDF";
    case "ready":
      return "Processing complete - ready to download";
    case "failed":
      return "Job processing encountered an error";
  }
}

/**
 * Check if job is in a terminal state
 */
export function isTerminalState(status: JobStatus): boolean {
  return status === "ready" || status === "failed";
}

/**
 * Check if job is actively processing
 */
export function isProcessing(status: JobStatus): boolean {
  return !isTerminalState(status) && status !== "queued";
}

/**
 * Get estimated stage progress weights for overall progress calculation
 * These weights are based on typical processing time distribution
 */
export const STAGE_WEIGHTS: Record<JobStatus, number> = {
  queued: 0,
  validating: 0.05, // ~5% of total time
  rendering: 0.25, // ~25% of total time
  detecting: 0.6, // ~60% of total time (ML inference)
  writing: 0.1, // ~10% of total time
  ready: 1,
  failed: 1,
};
