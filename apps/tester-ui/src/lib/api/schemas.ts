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
  download_url: z.string().optional(), // Can be relative path like "/jobs/{id}/result"
  error: JobErrorSchema.nullable().optional(), // Can be null or undefined
});

// Job Options (for form submission)
export const JobOptionsSchema = z.object({
  model_or_path: z.string().optional(), // Model name or path to weights
  device: z.union([z.string(), z.number()]).optional(), // cpu/cuda/0/1/etc
  fast: z.boolean().optional(),
  keep_existing_fields: z.boolean().optional(),
  use_signature_fields: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  image_size: z.number().int().positive().optional(),
});

// TypeScript types derived from schemas (single source of truth)
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type JobError = z.infer<typeof JobErrorSchema>;
export type JobCreateResponse = z.infer<typeof JobCreateResponseSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type JobOptions = z.infer<typeof JobOptionsSchema>;
