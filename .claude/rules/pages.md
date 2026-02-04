---
description: Page component development rules
globs: src/pages/**/*
---

# Page Component Rules

## Required Pattern
All page components must use React.memo with a named function:

```tsx
import { memo } from 'react';

export const PageName = memo(function PageName() {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header>
        <nav aria-label="Main navigation">...</nav>
      </header>
      <main role="main" className="max-w-7xl mx-auto px-4 py-4">
        {/* Page content */}
      </main>
    </div>
  );
});
```

## Layout Requirements
- Full height: `min-h-screen`
- Background: `bg-[#f5f5f5]`
- Semantic structure: header, main, footer
- Max width container: `max-w-7xl mx-auto`
- Responsive padding: `px-4 sm:px-6 lg:px-8`

## Page Types

### Public Pages (login, register)
- No auth check required
- Redirect if already authenticated
- Rate limiting on form submissions
- Audit logging for auth events

### Protected Pages (dashboard, settings)
- Wrap with `<ProtectedRoute>`
- Show loading skeleton while checking auth
- Handle session expiration gracefully
- Log unauthorized access attempts

### Admin Pages
- Additional role check (Admin only)
- Confirmation dialogs for destructive actions
- Comprehensive audit logging

## Data Loading Pattern
```tsx
const { data, loading, error, refetch } = useQuery({
  queryKey: ['resource'],
  queryFn: fetchResource,
});

if (loading) return <PageSkeleton />;
if (error) return <ErrorState onRetry={refetch} />;
return <PageContent data={data} />;
```

## Error Boundary
Each page should be wrapped in an error boundary:

```tsx
<ErrorBoundary fallback={<PageErrorFallback />}>
  <PageContent />
</ErrorBoundary>
```

## SEO Considerations
- Set document.title in useEffect
- Use semantic heading hierarchy (h1 > h2 > h3)
- One h1 per page
