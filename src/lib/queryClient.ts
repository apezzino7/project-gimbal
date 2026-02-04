/**
 * React Query Client Configuration
 *
 * Provides centralized query client with:
 * - Default stale times and cache times
 * - Error handling
 * - Retry logic
 */

import { QueryClient } from '@tanstack/react-query';

// =============================================================================
// Configuration
// =============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;

// =============================================================================
// Query Client
// =============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: STALE_TIME,

      // Cache data for 30 minutes
      gcTime: CACHE_TIME,

      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < MAX_RETRIES;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus in development
      refetchOnWindowFocus: import.meta.env.PROD,

      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Invalidate all queries for a specific key prefix
 */
export function invalidateQueries(keyPrefix: string | string[]) {
  const queryKey = Array.isArray(keyPrefix) ? keyPrefix : [keyPrefix];
  return queryClient.invalidateQueries({ queryKey });
}

/**
 * Prefetch a query to warm the cache
 */
export async function prefetchQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: STALE_TIME,
  });
}

/**
 * Get cached data without triggering a fetch
 */
export function getQueryData<T>(queryKey: string[]): T | undefined {
  return queryClient.getQueryData(queryKey);
}

/**
 * Set cached data directly
 */
export function setQueryData<T>(queryKey: string[], data: T) {
  return queryClient.setQueryData(queryKey, data);
}
