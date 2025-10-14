import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JobStatusResponse } from "../api/schemas";

const MAX_HISTORY_JOBS = 50;

type JobHistoryEntry = {
  job: JobStatusResponse;
  completedAt: string;
  duration: number; // milliseconds
};

type HistoryState = {
  jobs: JobHistoryEntry[];
  addJob: (job: JobStatusResponse, duration: number) => void;
  clearHistory: () => void;
  removeJob: (jobId: string) => void;
};

/**
 * Job history store with localStorage persistence
 * Stores completed jobs for user reference
 */
export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      jobs: [],
      addJob: (job, duration) =>
        set((state) => ({
          jobs: [
            {
              job,
              completedAt: new Date().toISOString(),
              duration,
            },
            ...state.jobs,
          ].slice(0, MAX_HISTORY_JOBS), // Keep last 50 jobs
        })),
      removeJob: (jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((entry) => entry.job.job_id !== jobId),
        })),
      clearHistory: () => set({ jobs: [] }),
    }),
    {
      name: "commonforms-history",
    }
  )
);
