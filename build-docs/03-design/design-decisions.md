# Design Decisions - Project Gimbal

## UI Philosophy

**Principle**: Compact, utilitarian, information-dense interface that prioritizes functionality over decorative spacing.

Think "compact mode" rather than "cramped" - tight but polished, minimal but readable.

---

## Spacing System

### Base Units (Compact)
- **XS**: 2px
- **SM**: 4px
- **MD**: 8px
- **LG**: 12px
- **XL**: 16px
- **2XL**: 20px

### Component Spacing
- **Card Margin**: 8px
- **Card Padding**: 12px (instead of 20px)
- **Button Padding**: 8px 16px (instead of 12px 24px)
- **Input Padding**: 6px 10px (instead of 10px 12px)
- **Form Field Gap**: 12px (instead of 16px)

### Whitespace Rules
- Minimize decorative spacing
- Use just enough margin/padding for clarity
- Prioritize information density
- Keep vertical rhythm tight but readable

---

## Typography

### Font Sizes (Compact)
- **Heading 1**: 24px (instead of 32px)
- **Heading 2**: 18px (instead of 24px)
- **Heading 3**: 16px (instead of 20px)
- **Body Text**: 14px (instead of 16px)
- **Small Text**: 12px (instead of 14px)
- **Caption**: 11px (instead of 12px)

### Line Heights
- Tight but readable
- Body: 1.4 (instead of 1.5-1.6)
- Headings: 1.2 (instead of 1.3-1.4)

---

## Interactive Elements

### Buttons
- **Height**: 32px (instead of 40px+)
- **Padding**: 8px 16px
- **Font Size**: 14px
- **Border Radius**: 4px (instead of 6-8px)

### Inputs
- **Height**: 32px (instead of 40px+)
- **Padding**: 6px 10px
- **Font Size**: 14px
- **Border Radius**: 4px

### Checkboxes/Radio
- **Size**: 14px (instead of 16px+)
- **Border Radius**: 2px

---

## Border Radius

**General Rule**: Subtle rounding, not bubbly

- **Small**: 2px (checkboxes, small elements)
- **Medium**: 4px (buttons, inputs, cards)
- **Large**: 6px (modals, large containers)

**Never use**: >8px border radius (too soft/bubbly)

---

## Cards and Containers

### Card Design
- **Padding**: 12px
- **Border Radius**: 4px
- **Shadow**: Subtle (0 1px 3px rgba(0,0,0,0.08))
- **Gap between cards**: 8px

### Layout Containers
- **Max Width**: Keep standard (1280px)
- **Side Padding**: 12px (mobile), 16px (desktop)

---

## Forms

### Layout
- **Label to Input Gap**: 4px
- **Field to Field Gap**: 12px
- **Section Gap**: 16px

### Inputs
- Minimal height (32px)
- Tight padding (6px 10px)
- Small font (14px)
- Subtle border radius (4px)

### Validation Messages
- **Font Size**: 12px
- **Margin Top**: 4px
- Keep inline, minimal spacing

---

## Navigation

### Navbar
- **Height**: 48px (instead of 64px)
- **Padding**: 8px 16px
- **Font Size**: 14px

### Tabs/Pills
- **Height**: 32px
- **Padding**: 6px 12px
- **Gap**: 4px

---

## Modals and Overlays

### Modal
- **Padding**: 16px
- **Border Radius**: 6px
- **Max Width**: 480px (small), 640px (medium)

### Popover/Tooltip
- **Padding**: 6px 10px
- **Font Size**: 12px
- **Border Radius**: 4px

---

## Color Usage

### Background Layers
- **Page Background**: #f5f5f5 (neutral, not distracting)
- **Card Background**: #ffffff
- **Hover States**: Subtle (5-10% opacity change)

### Borders
- **Default**: #e0e0e0 (1px, subtle)
- **Focus**: Primary color (2px)
- **Error**: Error color (2px)

---

## Responsive Behavior

### Mobile (<768px)
- Even tighter spacing (reduce by ~20%)
- Smaller font sizes acceptable
- Maintain 12px minimum for body text
- Stack elements vertically

### Tablet (768px-1023px)
- Use compact spacing
- Slightly larger than mobile
- Good middle ground

### Desktop (1024px+)
- Full compact design
- Use all horizontal space efficiently
- Multi-column layouts where appropriate

---

## Animation and Transitions

### Timing
- **Fast**: 150ms (hover, small changes)
- **Standard**: 200ms (most interactions)
- **Slow**: 300ms (page transitions)

### Easing
- `ease-out` for entrances
- `ease-in-out` for standard transitions

### What to Animate
- Hover states (background, border)
- Focus states (ring, border)
- Loading spinners
- Modal open/close

### What NOT to Animate
- Layout shifts
- Text changes
- Immediate feedback (clicks)

---

## Accessibility Rules

### Minimum Sizes
- **Touch Targets**: 40px (even if visually smaller)
- **Text**: 12px minimum
- **Icon Buttons**: 32px minimum

### Contrast
- **Text**: 4.5:1 minimum (WCAG AA)
- **Interactive Elements**: 3:1 minimum

### Focus States
- Always visible (2px ring)
- High contrast with background
- Primary color or system default

---

## Loading States

### Spinners
- **Size**: 24px (small), 32px (medium), 48px (large)
- **Border Width**: 2px
- Primary color

### Skeletons
- Subtle gray (#f0f0f0)
- Minimal animation (pulse)
- Match content dimensions

---

## Icons

### Sizing
- **Small**: 14px
- **Medium**: 16px
- **Large**: 20px
- **XL**: 24px

### Usage
- Inline with text (16px)
- Buttons (14px-16px)
- Navigation (20px)

---

## Data Tables

### Cell Padding
- **Vertical**: 6px
- **Horizontal**: 10px

### Row Height
- **Minimum**: 32px
- **Comfortable**: 40px

### Header
- **Height**: 32px
- **Font Weight**: 600
- **Background**: Subtle (#fafafa)

---

## Dashboard Widgets

### Widget Padding
- **Inner**: 12px
- **Between Widgets**: 8px

### Widget Headers
- **Height**: 32px
- **Padding**: 8px 12px
- **Font Size**: 14px (bold)

---

## Error Handling

### Error Messages
- **Padding**: 8px 12px
- **Font Size**: 13px
- **Border Radius**: 4px
- **Icon**: 16px
- Inline with form (not separate)

### Success Messages
- Same compact styling as errors
- Brief display time (3-5s)

---

## Dos and Don'ts

### DO
✅ Keep spacing tight but readable
✅ Use 4px border radius for most elements
✅ Prioritize information density
✅ Use 14px as default body text
✅ Keep button heights at 32px
✅ Minimize vertical spacing between elements
✅ Use subtle shadows (1-3px blur)

### DON'T
❌ Use >8px border radius (too bubbly)
❌ Add decorative spacing
❌ Make buttons >40px tall
❌ Use large fonts unnecessarily
❌ Add excessive padding to cards
❌ Create excessive whitespace
❌ Use heavy/prominent shadows

---

## Implementation Guidelines for AI Agents

When building new components:

1. **Start compact**: Default to minimal spacing
2. **Check the spacing system**: Use predefined values
3. **Font sizes**: 14px body, 24px h1, scale down from there
4. **Interactive elements**: 32px height for buttons/inputs
5. **Border radius**: 4px for most, 6px for large containers
6. **Padding**: 12px for cards, 8px 16px for buttons
7. **Margins**: 8px between related elements, 16px between sections
8. **Always test**: Ensure readability isn't compromised

---

## CRITICAL: Implementation Approach

### ⚠️ How to Implement Compact Design (The Correct Way)

**ALWAYS use explicit Tailwind utility classes on individual components. NEVER modify global CSS.**

#### ✅ CORRECT Approach

Use explicit height, text, padding, and margin utilities on each component:

```tsx
// LoginPage - Correct Implementation
<div className="max-w-sm p-5">  {/* Explicit padding */}
  <h1 className="text-lg mb-4">  {/* Explicit text size */}
    Project Gimbal
  </h1>
  <input className="h-9 px-2.5 text-sm" />  {/* Explicit height and text */}
  <button className="h-9 px-4 text-sm">Login</button>
</div>

// DashboardPage - Correct Implementation
<nav className="h-12">  {/* Explicit height */}
  <h1 className="text-sm">Project Gimbal</h1>
  <button className="h-8 px-3 text-xs">Logout</button>
</nav>
```

#### ❌ INCORRECT Approach (This WILL Break Your UI)

**DO NOT set global font-size on the body element:**

```css
/* index.css - DO NOT DO THIS */
body {
  font-size: 14px;  /* ❌ NEVER DO THIS - BREAKS EVERYTHING */
}
```

**Why this breaks:**
- CSS inheritance causes the global font-size to cascade to ALL elements
- Relative sizing breaks (em, rem units become incorrect)
- Tailwind's default sizing expectations are violated
- Visual balance and hierarchy collapse
- Components render with unexpected dimensions

### Implementation Checklist

When refactoring to compact design:

- [ ] Use `h-9` for input heights (not `py-2`)
- [ ] Use `h-8` or `h-9` for button heights (not `py-2`)
- [ ] Use `text-sm` for body text (not global font-size)
- [ ] Use `text-xs` for labels and small text
- [ ] Use `text-lg` for headings (not `text-2xl`)
- [ ] Use `p-4` or `p-5` for card padding (not `p-6` or `p-8`)
- [ ] Use `mb-2` or `mb-4` for spacing (not `mb-6`)
- [ ] Use explicit utilities, NEVER modify global CSS

### Real-World Example: Before and After

**Before (Spacious):**
```tsx
<div className="max-w-md p-8">
  <h1 className="text-2xl mb-6">Login</h1>
  <input className="py-2 px-3" />
  <button className="py-2 px-4">Submit</button>
</div>
```

**After (Compact - Correct):**
```tsx
<div className="max-w-sm p-5">
  <h1 className="text-lg mb-4">Login</h1>
  <input className="h-9 px-2.5 text-sm" />
  <button className="h-9 px-4 text-sm">Submit</button>
</div>
```

### Tailwind Utility Reference for Compact Design

| Element | Spacious | Compact | Utility Class |
|---------|----------|---------|---------------|
| Input height | 40px+ | 36px | `h-9` |
| Button height | 40px+ | 36px | `h-9` |
| Small button | 40px | 32px | `h-8` |
| Body text | 16px | 14px | `text-sm` |
| Small text | 14px | 12px | `text-xs` |
| Heading | 24px+ | 18px | `text-lg` |
| Card padding | 32px | 20px | `p-5` |
| Section padding | 24px | 16px | `p-4` |

---

## Version History

- **v1.0** (2026-02-02): Initial compact design system established
