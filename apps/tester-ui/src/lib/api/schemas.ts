import { z } from "zod";

/**
 * Zod v4 schemas for runtime API validation
 * Single source of truth for API types
 */

// Constants
const UUID_HEX_LENGTH = 32;

// Job Status Enum
export const JobStatusSchema = z.enum([
  "queued",
  "validating",
  "rendering",
  "detecting",
  "writing",
  "ready",
  "failed",
]);

// Job Error
export const JobErrorSchema = z.object({
  type: z.string(),
  detail: z.string(),
});

// Job Create Response
export const JobCreateResponseSchema = z.object({
  job_id: z.string().length(UUID_HEX_LENGTH), // UUID hex format
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
});

// Job Status Response
export const JobStatusResponseSchema = z.object({
  job_id: z.string().length(UUID_HEX_LENGTH),
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
  message: z.string().optional(),
  download_url: z.string().url().optional(),
  error: JobErrorSchema.optional(),
});

// Job Options (for form submission)
export const JobOptionsSchema = z.object({
  model: z.enum(["FFDNet-S", "FFDNet-L"]).optional(),
  device: z.enum(["cpu", "cuda"]).optional(),
  fast: z.boolean().optional(),
});

// TypeScript types derived from schemas (single source of truth)
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobError = z.infer<typeof JobErrorSchema>;
export type JobCreateResponse = z.infer<typeof JobCreateResponseSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type JobOptions = z.infer<typeof JobOptionsSchema>;
