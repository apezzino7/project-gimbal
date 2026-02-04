---
description: Custom React hooks development rules
globs: src/hooks/**/*
---

# Custom Hooks Rules

## Naming Convention
- File: `useHookName.ts`
- Function: `useHookName`
- Must start with `use` prefix

## Structure Template
```tsx
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook description
 * @param param - Parameter description
 * @returns Return value description
 *
 * @example
 * const { data, loading, error } = useHookName(param);
 */
export function useHookName<T>(param: T) {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [param]);

  return { data, loading, error };
}

export default useHookName;
```

## Return Value Pattern
Prefer object return for multiple values:
```tsx
return { data, loading, error, refetch };
```

## Dependencies
- List all dependencies explicitly in arrays
- Use ESLint react-hooks/exhaustive-deps rule
- Document intentionally omitted deps with comment

## Cleanup Requirements
- Return cleanup function from useEffect when needed
- Unsubscribe from subscriptions (Supabase realtime)
- Clear timeouts/intervals
- Cancel pending requests (AbortController)

## React Query Hooks
```tsx
export function useResource(id: string) {
  return useQuery({
    queryKey: ['resource', id],
    queryFn: () => fetchResource(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## Mutation Hooks
```tsx
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

## Error Handling
Hooks that can fail should expose error state:
```tsx
const [error, setError] = useState<Error | null>(null);

try {
  // operation
} catch (err) {
  setError(err instanceof Error ? err : new Error('Unknown error'));
}
```

## Auth Hooks
- Always check session validity
- Handle token refresh
- Log session events to audit
- Clear sensitive data on logout
