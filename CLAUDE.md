# Project Gimbal

Internal company analytics and marketing campaign platform with data import and campaign management (SMS/Email).

**Compliance:** TCPA, CAN-SPAM (MVP); GDPR, SOC 2 (Future)

@README.md
@PLAN.md

## Commands

```bash
npm run dev          # Development server (Vite)
npm run build        # Type-check + production build
npm run test         # Run unit tests (Vitest)
npm run test:ui      # Tests with interactive UI
npm run test:coverage # Coverage report (target: 70%+)
npm run lint         # ESLint
```

## Tech Stack

**Frontend:** React 19 + TypeScript 5 (strict) + Vite 7 + Tailwind CSS 4
**State:** Zustand (global), React Query (server), Context (theme/session)
**Forms:** React Hook Form + Zod validation
**Charts:** Recharts
**Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
**Messaging:** Twilio (SMS), SendGrid (Email)
**External:** Sentry (errors)
**Testing:** Vitest + React Testing Library (unit), Cypress (E2E), MSW (mocking)

### Future Tech (Post-MVP)
- **Visual Builders:** React Flow (Phase A)
- **Social APIs:** Facebook, Instagram, LinkedIn, X/Twitter (Phase B)
- **AI:** OpenAI, Anthropic, Ollama (Phase C)

## Directory Structure

```
src/
├── components/      # Reusable UI components
│   ├── common/      # Buttons, inputs, modals
│   ├── layout/      # Headers, sidebars, footers
│   ├── dashboard/   # Dashboard-specific
│   ├── campaigns/   # Campaign builder
│   ├── admin/       # Admin portal
│   └── data-sources/ # Data import UI
├── pages/           # Route page components (React.memo wrapped)
├── services/        # API clients and data services
│   ├── api/         # Supabase API helpers
│   ├── campaigns/   # SMS/Email service layer
│   ├── analytics/   # Analytics data services
│   └── data-sources/ # Data import services
├── hooks/           # Custom React hooks
├── stores/          # Zustand stores
├── context/         # React context providers
├── utils/           # Utility functions (with __tests__/)
├── types/           # TypeScript type definitions
├── config/          # Environment and app config
├── constants/       # Application constants
├── lib/             # External library clients (Supabase)
├── assets/          # Static assets
└── styles/          # Global styles and theme

supabase/
├── migrations/      # Database migrations (NNN_description.sql)
└── functions/       # Edge Functions (Deno)
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `ErrorBoundary.tsx` |
| Hooks | use prefix, camelCase | `useAuth.ts` |
| Stores | camelCaseStore.ts | `campaignStore.ts` |
| Services | camelCaseService.ts | `smsService.ts` |
| Utils | camelCase.ts | `validation.ts` |
| Constants | UPPER_SNAKE_CASE | `RATE_LIMIT` |
| Types | PascalCase interfaces | `CampaignProps` |
| Storage keys | gimbal- prefix | `gimbal-auth-token` |

## Architecture Patterns

- **State Management:** Zustand for global, React Query for server state, Context for theme/session
- **Data Flow:** Unidirectional (props down, events up)
- **Components:** Compound components for complex UI, React.memo on route pages
- **Error Handling:** Error boundaries per feature section, toast notifications
- **Loading:** Skeleton components, not spinners
- **Imports:** React → third-party → internal absolute → relative → types last

## Security Requirements

### Authentication
- PKCE OAuth flow (Supabase Auth)
- MFA for admin roles (Phase D - Future)
- Session: 15min access token, 7d refresh, 30min inactivity timeout

### Authorization (RBAC)
Roles: Admin > User > Viewer (3 tiers for MVP)
- Admin: Full access, user management, settings
- User: Create/manage campaigns, view analytics
- Viewer: Read-only access to reports
- RLS enforced at database level
- Permission checks in UI and API

### Rate Limiting
- Auth: 5 requests/15min (lockout after exceeded)
- Read: 100 requests/min
- Write: 50 requests/min
- Campaigns: 10 requests/min

### Input Validation
- Zod schemas for all user input
- `sanitizeEmail()` before any auth operations
- DOMPurify for HTML sanitization
- Parameterized queries only (never string concatenation)

### Audit Logging
- 30-day retention (MVP); 7-year for future SOC 2
- Log: login, logout, password changes, data access, campaign sends
- Use `auditLogger.log()` for all security events

## Compliance (MVP)

### TCPA (SMS)
- Prior consent required before any SMS
- Opt-out honored immediately (STOP keyword)
- Quiet hours: 8 AM - 9 PM recipient timezone

### CAN-SPAM (Email)
- Physical address in emails
- Clear unsubscribe mechanism
- 10-day honor window for unsubscribes

### Future Compliance (Phase D)
- Full GDPR: data export, erasure, portability
- SOC 2 Type II: 7-year audit retention
- Breach notification: 72-hour workflow

## Campaign Management

### SMS (Twilio)
- Templates: `{{variable}}` placeholder syntax
- Rate limit: 10 messages/second
- TCPA compliance: Prior consent required, opt-out honored immediately, 8 AM - 9 PM recipient timezone
- States: queued → sent → delivered → failed
- Track all delivery events with audit logging

### Email (SendGrid)
- Templates: MJML compiled to HTML
- Domain auth: SPF, DKIM, DMARC required
- CAN-SPAM: Physical address, clear unsubscribe, 10-day honor window
- States: sent → delivered → opened → clicked → bounced
- Preference center for subscription management

## Testing Requirements

- **Coverage:** 70% overall minimum, 90% critical paths
- **Unit tests:** In `__tests__/` folders colocated with source
- **E2E tests:** In `cypress/e2e/` for user workflows
- **Mocking:** MSW for API, never mock implementation details
- **Pattern:** describe/it/expect with clear test names

## Key Constants

### Storage Keys (from constants/app.ts)
- `gimbal-auth-token` - Supabase session
- `gimbal-remember-me` - Remember me flag
- `gimbal-login-attempts-{email}` - Rate limiting
- `gimbal-audit-logs` - Local audit cache

### Audit Event Types (MVP)
- AUTH: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SESSION_EXPIRED, ACCOUNT_LOCKED
- USER: USER_CREATED, USER_DELETED, ROLE_CHANGED, PASSWORD_CHANGED
- CAMPAIGN: CAMPAIGN_CREATED, CAMPAIGN_SENT, CAMPAIGN_FAILED
- IMPORT: DATA_SOURCE_CONNECTED, SYNC_STARTED, SYNC_COMPLETED, SYNC_FAILED

### State Machines
- **Campaign:** DRAFT → SCHEDULED → SENDING → SENT → FAILED
- **Message:** queued → sent → delivered → opened → clicked → bounced → failed
- **Data Sync:** idle → syncing → success → failed

## Design Tokens

```
Primary:    #0353a4    (buttons, links, accents)
Secondary:  #006daa    (secondary actions)
Dark:       #003559    (headings, emphasis)
Light:      #b9d6f2    (backgrounds, highlights)
Error:      #d32f2f    (errors, destructive actions)
Success:    #2e7d32    (success states)
Warning:    #ed6c02    (warnings)
Background: #f5f5f5    (page backgrounds)
Border:     #e0e0e0    (inputs, cards)
```

## Common Patterns

### Page Component
```tsx
export const PageName = memo(function PageName() {
  return <div className="min-h-screen bg-[#f5f5f5]">...</div>;
});
```

### Hook Pattern
```tsx
export function useHookName() {
  // implementation
  return { data, loading, error };
}
```

### Context Pattern
```tsx
export const SomeContext = createContext<ContextValue | null>(null);
export function SomeProvider({ children }: { children: ReactNode }) { ... }
export function useSome() {
  const context = useContext(SomeContext);
  if (!context) throw new Error('useSome must be used within SomeProvider');
  return context;
}
```

### Zustand Store
```tsx
export const useStore = create<StoreState>()((set, get) => ({
  data: [],
  loading: false,
  fetchData: async () => { ... },
}));
```

### Data Import Service Pattern
```tsx
// Data cleaning and import
async function importData(sourceId: string, rows: Record<string, unknown>[]) {
  const config = await getColumnConfig(sourceId);
  const cleanedRows = processRows(rows, config);
  await insertRowsBatched(tableName, cleanedRows);
  await auditLogger.log('SYNC_COMPLETED', { sourceId, count: cleanedRows.length });
}
```

## Common Pitfalls

- Never hardcode storage keys - use `STORAGE_KEYS` constants
- Never skip rate limiting checks before auth operations
- Never skip email sanitization - use `sanitizeEmail()`
- Never skip audit logging for security events
- Never use inline styles - use Tailwind classes
- Never create anonymous components - use named functions with memo for pages
- Never commit .env files or credentials
- Never use `any` type - use proper TypeScript types
- Never import external data without validation - sanitize all inputs
- Never send SMS without consent check - TCPA compliance
- Never skip unsubscribe mechanism in emails - CAN-SPAM compliance

## Optional MCP Servers

Add Supabase MCP when env vars are configured:
```bash
claude mcp add supabase -- npx -y @anthropic-ai/mcp-server-supabase \
  --url "$VITE_SUPABASE_URL" \
  --key "$SUPABASE_SERVICE_ROLE_KEY"
```
