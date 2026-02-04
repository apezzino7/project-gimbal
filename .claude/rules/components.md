---
description: React component development rules
globs: src/components/**/*
---

# Component Development Rules

## File Structure
1. Type imports (`import type`)
2. React/library imports
3. Internal imports
4. Component interface definition
5. Helper types/constants
6. Main component function
7. Sub-components
8. Named export + optional default export

## Component Pattern
```tsx
interface ComponentNameProps {
  children?: ReactNode;
  className?: string;
}

export function ComponentName({ children, className }: ComponentNameProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default ComponentName;
```

## Accessibility Requirements (WCAG 2.1 AA)
- [ ] Interactive elements have accessible names (aria-label or visible text)
- [ ] Color is not the only visual indicator
- [ ] Focus states are visible (ring-2 ring-[#0353a4])
- [ ] ARIA attributes used correctly
- [ ] Keyboard navigation works (tabIndex, onKeyDown)
- [ ] Screen reader tested

## Required Props
- UI components must accept `className` prop for customization
- Interactive components need `disabled`, `aria-label` props
- Form components need `id`, `name`, `aria-describedby`

## Error Display Pattern
```tsx
{error && (
  <div role="alert" aria-live="assertive" className="text-[#d32f2f] text-sm mt-1">
    {error}
  </div>
)}
```

## Loading State Pattern
```tsx
{loading ? (
  <Skeleton className="h-10 w-full" />
) : (
  <ActualContent />
)}
```

## Component Categories

### Common (buttons, inputs, modals)
- Accept all standard HTML attributes via spread
- Support variants: primary, secondary, danger
- Handle loading, disabled states

### Layout (headers, sidebars)
- Use semantic HTML (header, nav, main, aside)
- Responsive by default (mobile-first)
- Support collapsed/expanded states

### Dashboard Components
- Accept data prop with typed interface
- Handle empty states gracefully
- Support refresh/refetch callback

### Campaign Components
- Validate against compliance rules
- Show character counts for SMS (160 char limit)
- Preview mode support

### Admin Components
- Permission-gated rendering
- Confirmation dialogs for destructive actions
- Audit logging for changes
