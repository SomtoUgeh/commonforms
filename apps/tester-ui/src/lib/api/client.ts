import ky from "ky";
import {
  DEFAULT_BACKEND_URL,
  HTTP_RETRY_COUNT,
  STATUS_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
} from "@/constants/api";
import {
  type JobCreateResponse,
  JobCreateResponseSchema,
  type JobOptions,
  type JobStatusResponse,
  JobStatusResponseSchema,
} from "./schemas";

/**
 * Create ky HTTP client with default configuration
 */
const createApiClient = (baseUrl: string) => {
  return ky.create({
    prefixUrl: baseUrl,
    timeout: STATUS_TIMEOUT_MS,
    retry: HTTP_RETRY_COUNT,
    hooks: {
      beforeRequest: [
        (request) => {
          // Log requests in development
          if (import.meta.env.DEV) {
            // biome-ignore lint/suspicious/noConsole: Development logging
            console.log(`🌐 ${request.method} ${request.url}`);
          }
        },
      ],
    },
  });
};

/**
 * Create job by uploading PDF with options
 */
export async function createJob(
  file: File,
  options?: JobOptions,
  baseUrl: string = DEFAULT_BACKEND_URL
): Promise<JobCreateResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (options) {
    formData.append("options", JSON.stringify(options));
  }

  const api = createApiClient(baseUrl);
  const response = await api
    .post("jobs", {
      body: formData,
      timeout: UPLOAD_TIMEOUT_MS,
    })
    .json();

  // Runtime validation - throws ZodError if API contract violated
  return JobCreateResponseSchema.parse(response);
}

/**
 * Get job status by ID
 */
export async function getJobStatus(
  jobId: string,
  baseUrl: string = DEFAULT_BACKEND_URL
): Promise<JobStatusResponse> {
  const api = createApiClient(baseUrl);
  const response = await api.get(`jobs/${jobId}`).json();

  // Catches unexpected API changes immediately
  return JobStatusResponseSchema.parse(response);
}

// Regex for trailing slashes (defined at top level for performance)
const TRAILING_SLASH_REGEX = /\/+$/;

/**
 * Get download URL for completed job
 */
export function getDownloadUrl(
  jobId: string,
  baseUrl: string = DEFAULT_BACKEND_URL
): string {
  const base = baseUrl.replace(TRAILING_SLASH_REGEX, "");
  return `${base}/jobs/${jobId}/result`;
}

/**
 * Download result PDF
 */
export function downloadResult(
  jobId: string,
  baseUrl: string = DEFAULT_BACKEND_URL
): Promise<Blob> {
  const api = createApiClient(baseUrl);
  return api.get(`jobs/${jobId}/result`).blob();
}
