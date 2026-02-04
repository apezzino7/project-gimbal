# Project Gimbal - Development Plan

Internal company platform for analytics dashboards and marketing campaign management.

## Current Status: ~40% Complete

**Completed:**
- Authentication with PKCE, rate limiting, audit logging
- Core components (ErrorBoundary, ProtectedRoute, Toast, Skeleton)
- Common UI components (Button, Input, Select, Card, Modal, Badge, etc.)
- Layout components (AppLayout, Header, Sidebar)
- Dashboard components (MetricCard, LineChart, BarChart, DonutChart, DataTable, DateRangePicker)
- DashboardPage (UI complete, using mock data)
- **CRM Module** (NEW):
  - Database: sites, members, membership_levels, transactions, visits, consent, automation
  - Components: SiteList, MemberList, MemberDetail, ImportWizard (8 steps)
  - Services: siteService, memberService, memberImportService
  - Types: Comprehensive member.ts definitions
- Data import services (cleaningService, importTableService, scheduleService)

**In Progress:**
- Connect dashboard to real CRM data
- State management (Zustand stores, React Query)

**See [phases.md](phases.md) for detailed implementation roadmap.**

---

## MVP Scope (6 Weeks)

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1-2 | Foundation + Dashboard | Components, state management, Recharts analytics |
| 3-4 | Data Import + Campaigns | Import wizard, campaign CRUD, templates |
| 5-6 | Messaging + Launch | Twilio SMS, SendGrid Email, user validation |

### MVP Features
1. **CRM Module** - Multi-site member management, LTV tracking, consent management
2. **Data Import** - CSV, PostgreSQL, GA4, Meta Pixel with scheduled syncs
3. **Campaign Management** - SMS + Email campaigns with templates
4. **Dashboard Analytics** - Metrics, charts, date filtering (connected to CRM data)
5. **Admin Portal** - User management, settings

---

## Technology Stack

**Frontend:** React 19 + TypeScript 5 (strict) + Vite 7 + Tailwind CSS 4
**State:** Zustand (global), React Query (server)
**Forms:** React Hook Form + Zod
**Charts:** Recharts
**Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
**Messaging:** Twilio (SMS), SendGrid (Email)
**Testing:** Vitest + React Testing Library + Cypress
**Monitoring:** Sentry

**Post-MVP Tech (Phase A-C):**
- React Flow (visual builders)
- Social APIs (Facebook, Instagram, LinkedIn, X)
- AI APIs (OpenAI, Anthropic, Ollama - BYOK)

---

## Simplified Architecture

### Single-Tenant Deployment
- Single Supabase instance
- User-based data isolation via RLS
- Fixed company branding

### 3-Tier RBAC (MVP)
```
Admin > User > Viewer

Admin:  Full access, user management, settings
User:   Create/manage campaigns, view analytics
Viewer: Read-only access to reports
```

### Audit Retention
- **MVP:** 30 days (internal debugging)
- **Future (Phase D):** 7 years (SOC 2 compliance)

---

## Compliance (MVP)

| Standard | MVP Requirements |
|----------|------------------|
| **TCPA** | Prior SMS consent, opt-out honored, 8 AM - 9 PM quiet hours |
| **CAN-SPAM** | Physical address, clear unsubscribe, 10-day honor window |

**Deferred to Phase D:** Full GDPR (export/erasure), SOC 2 (7-year retention)

---

## Database Migrations (MVP)

### Completed Migrations

| # | Migration | Status | Description |
|---|-----------|--------|-------------|
| 1 | rate_limiting | Done | Login attempt tracking |
| 2 | audit_logs | Done | Audit logging (30-day retention) |
| 4 | sites_members | Done | Multi-site member management (CRM) |
| 5 | member_transactions_visits | Done | LTV calculation, visit tracking (CRM) |
| 6 | consent_automation | Done | TCPA/CAN-SPAM consent, automation triggers (CRM) |

### Remaining Migrations

| # | Migration | Sprint | Description |
|---|-----------|--------|-------------|
| 7 | campaigns | 2 | Campaign management + templates |
| 8 | messages | 3 | Message delivery tracking |
| 9 | app_settings | 4 | Application settings, API credentials |

---

## Success Criteria (MVP)

- [ ] Data import from CSV and PostgreSQL working
- [ ] GA4 and Meta Pixel sync operational
- [ ] SMS/Email campaigns can be created and sent
- [ ] Dashboard shows campaign metrics
- [ ] Admin can manage users and settings
- [ ] 3-5 users validated the workflow
- [ ] TCPA/CAN-SPAM compliance enforced

---

## Post-MVP Add-on Modules

| Phase | Feature | Timeline | Details |
|-------|---------|----------|---------|
| A | Visual Builders | 2 weeks | Campaign flows, segment builder, dashboard builder |
| B | Social Media | 2 weeks | Facebook, Instagram, LinkedIn, X integration |
| C | AI Assistant | 2 weeks | BYOK (OpenAI, Anthropic, Ollama) |
| D | Enterprise | As needed | Multi-instance, MFA, GDPR, SOC 2 |

See `build-docs/10-future/` for detailed documentation.

---

## Architecture Principles

### Data Isolation (MVP)
- RLS policies on all tables
- User-based access control
- No cross-user data exposure

### Provider Abstraction
- Swappable SMS/Email providers
- External data source connectors
- Future: AI provider interface (BYOK)

### Simplicity First
- Build only what's needed for MVP
- Validate with 3-5 users before expanding
- Add features incrementally post-MVP
