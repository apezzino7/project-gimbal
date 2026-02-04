/**
 * Library exports
 *
 * @module lib
 */

// Supabase client
export { supabase } from './supabase';

// React Query
export { queryClient, invalidateQueries, prefetchQuery, getQueryData, setQueryData } from './queryClient';
export * from './queryKeys';
export { QueryProvider } from './QueryProvider';
