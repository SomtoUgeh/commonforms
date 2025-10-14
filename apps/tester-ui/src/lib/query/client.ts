import { QueryClient } from "@tanstack/react-query";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_TO_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
const CACHE_TIME_MINUTES = 5;

/**
 * TanStack Query client configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always fetch fresh status
      gcTime: CACHE_TIME_MINUTES * MINUTES_TO_MS, // Cache for 5 minutes
      retry: false, // Don't retry failed polls
      refetchOnWindowFocus: false, // Manual control only
    },
    mutations: {
      retry: 1, // Retry uploads once
    },
  },
});
