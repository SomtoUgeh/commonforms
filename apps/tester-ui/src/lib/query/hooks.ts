import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "@/constants/api";
import { createJob, getJobStatus } from "../api/client";
import type { JobOptions } from "../api/schemas";
import { jobKeys } from "./keys";

/**
 * Hook for uploading a PDF and creating a job
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      options,
      baseUrl,
    }: {
      file: File;
      options?: JobOptions;
      baseUrl?: string;
    }) => createJob(file, options, baseUrl),
    onSuccess: (job) => {
      queryClient.setQueryData(jobKeys.status(job.job_id), job);
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

/**
 * Hook for polling job status
 * Automatically stops polling when job reaches terminal state
 */
export function useJobStatus(
  jobId: string | null,
  baseUrl?: string,
  pollIntervalMs: number = POLL_INTERVAL_MS
) {
  const interval = pollIntervalMs > 0 ? pollIntervalMs : POLL_INTERVAL_MS;

  return useQuery({
    queryKey: jobKeys.status(jobId || ""),
    queryFn: () => {
      if (!jobId) {
        throw new Error("Job ID is required");
      }
      return getJobStatus(jobId, baseUrl);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling on terminal states
      if (data?.status === "ready" || data?.status === "failed") {
        return false;
      }
      return interval;
    },
  });
}
