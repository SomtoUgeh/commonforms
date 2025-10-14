/**
 * Query key factory for consistent cache keys
 * Follows TanStack Query best practices
 */

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters?: string) => [...jobKeys.lists(), { filters }] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  status: (id: string) => [...jobKeys.detail(id), "status"] as const,
};
