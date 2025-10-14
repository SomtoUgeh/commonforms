import { useEffect, useState } from "react";
import type { JobStatusResponse } from "@/lib/api/schemas";
import { isTerminalState } from "@/utils/stage-labels";

/**
 * Job timing metrics for a single job
 */
export type JobMetrics = {
  startTime: number; // Unix timestamp
  elapsedMs: number; // Milliseconds since job started
  isComplete: boolean;
  completedAt: number | null; // Unix timestamp when completed
  totalDuration: number | null; // Total duration in ms (only when complete)
};

/**
 * Hook to track job timing metrics
 * Automatically starts tracking when job is created and stops on completion
 */
export function useJobMetrics(
  jobStatus: JobStatusResponse | undefined
): JobMetrics {
  const [startTime] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  const isComplete = jobStatus ? isTerminalState(jobStatus.status) : false;

  // Update elapsed time every 100ms while job is processing
  useEffect(() => {
    if (isComplete) {
      // Job finished - record completion time if not already set
      if (!completedAt) {
        const now = Date.now();
        setCompletedAt(now);
        setElapsedMs(now - startTime);
      }
      return;
    }

    // Job still processing - update elapsed time
    const TICK_INTERVAL_MS = 100;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isComplete, startTime, completedAt]);

  return {
    startTime,
    elapsedMs,
    isComplete,
    completedAt,
    totalDuration: completedAt ? completedAt - startTime : null,
  };
}
