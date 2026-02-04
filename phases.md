# Project Gimbal - Implementation Roadmap

Internal company platform for analytics dashboards and marketing campaign management.

## Current State (~40% Complete)

### Completed

**Authentication & Security:**
- Authentication MVP with PKCE, rate limiting, audit logging, remember me
- Database migrations: `001_rate_limiting.sql`, `002_audit_logs.sql`

**UI Components:**
- Core: ErrorBoundary, ProtectedRoute, Toast, Skeleton
- Common: Button, Input, Select, Checkbox, Textarea, Card, Modal, Badge, Spinner, Avatar, EmptyState, Alert
- Layout: AppLayout, Header, Sidebar (collapsible)
- Dashboard: MetricCard, LineChart, BarChart, DonutChart, DataTable, DateRangePicker

**Pages:**
- LoginPage (full-featured with rate limiting)
- DashboardPage (UI complete, mock data)

**CRM Module (NEW):**
- Database migrations: `004_sites_members.sql`, `005_member_transactions_visits.sql`, `006_consent_automation.sql`
- Types: `src/types/member.ts` (comprehensive type definitions)
- Components in `src/components/members/`:
  - SiteSelector, SiteList, SiteForm
  - MemberList, MemberDetail, MemberForm
  - ImportWizard with 8 step components
- Services in `src/services/members/`:
  - siteService, memberService, memberImportService, memberImportDataSourceService

**Data Import Services:**
- cleaningService, importTableService, scheduleService

**Hooks & Utilities:**
- Hooks: useAuth, useToast, useDebounce
- Utilities: validation, rateLimiter, auditLog, rememberMe, errors
- Tests: validation.test.ts, rateLimiter.test.ts

### In Progress
- Connect dashboard to real CRM data
- Zustand stores (authStore, uiStore, crmStore)
- React Query setup

### Dependencies to Install
```bash
npm install zustand @tanstack/react-query react-hook-form zod @hookform/resolvers recharts dompurify date-fns papaparse
npm install -D @types/dompurify msw cypress @testing-library/cypress
```

---

# MVP (6 Weeks)

## Phase 1: Foundation & Dashboard (Week 1-2)

### 1.1 Common Components ✅ COMPLETE
Created in `src/components/common/`:
- [x] Button.tsx (primary, secondary, danger variants)
- [x] Input.tsx, Select.tsx, Checkbox.tsx, Textarea.tsx
- [x] Modal.tsx, Card.tsx, Badge.tsx
- [x] Spinner.tsx, Avatar.tsx, EmptyState.tsx, Alert.tsx

### 1.2 Layout Components ✅ COMPLETE
Created in `src/components/layout/`:
- [x] AppLayout.tsx (main shell with sidebar)
- [x] Header.tsx, Sidebar.tsx (collapsible)

### 1.3 State Management ⏳ IN PROGRESS
Create in `src/stores/`:
- [ ] authStore.ts (migrate from useAuth hook)
- [ ] uiStore.ts (sidebar, modals)
- [ ] crmStore.ts (member/site state)

Create in `src/lib/`:
- [ ] queryClient.ts (React Query setup)
- [ ] queryKeys.ts (centralized query keys)

### 1.4 Dashboard Components ✅ COMPLETE
Created in `src/components/dashboard/`:
- [x] MetricCard.tsx, DonutChart.tsx
- [x] LineChart.tsx, BarChart.tsx
- [x] DataTable.tsx, DateRangePicker.tsx

### 1.5 Dashboard Real Data ⏳ IN PROGRESS
- [ ] Create analyticsService to query CRM data
- [ ] Connect DashboardPage to real member/transaction data
- [ ] Replace mock SAMPLE_CAMPAIGNS with real queries

### Exit Criteria
- [x] All common components created
- [x] Layout responsive on mobile
- [ ] Zustand stores working
- [ ] React Query configured
- [x] Dashboard displays metrics (mock data)
- [x] Charts render with data (mock data)
- [x] Date range filtering works
- [ ] Dashboard connected to real CRM data

---

## CRM Module ✅ COMPLETE (Added to Scope)

> **Note:** This module was built to support member management, LTV tracking, and TCPA/CAN-SPAM compliance. It provides the foundation for campaign targeting.

### Database Migrations (004-006)

**`004_sites_members.sql`** - Multi-site member management:
- `sites` - Hierarchical locations (company → region → site)
- `membership_levels` - Per-site custom tiers with benefits
- `members` - Full CRM records with LTV, CAC, tags, custom fields
- RLS policies for user-based data isolation

**`005_member_transactions_visits.sql`** - Engagement tracking:
- `member_transactions` - Purchase history for LTV calculation
- `member_visits` - Check-in/visit tracking
- Automatic LTV calculation via triggers

**`006_consent_automation.sql`** - Compliance & automation:
- `member_consent` - TCPA/CAN-SPAM consent tracking per member
- `promo_codes` - Attribution and CAC tracking
- `automation_triggers` - Time-based and event-based automations
- `automation_executions` - Execution history
- Helper functions: `can_send_sms()`, `can_send_email()`, `record_sms_opt_out()`

### Components (in `src/components/members/`)
- [x] SiteSelector, SiteList, SiteForm
- [x] MemberList, MemberDetail, MemberForm
- [x] ImportWizard with step components:
  - SourceSelection, DataPreview, ColumnMapping
  - DuplicateHandling, ScheduleConfig, SiteAssignment
  - CleaningRulesStep, CleaningPreview

### Services (in `src/services/members/`)
- [x] siteService.ts - Site CRUD operations
- [x] memberService.ts - Member CRUD with search
- [x] memberImportService.ts - Import processing
- [x] memberImportDataSourceService.ts - Data source connections

### Types
- [x] `src/types/member.ts` - Comprehensive type definitions for all CRM entities

---

## Phase 2: Data Import & Campaigns (Week 3-4)

### 2.1 Data Import Module

> **Note:** Migration `004_data_sources` was replaced by CRM migrations. Data import UI still needed.

**Database Migration: `007_data_sources.sql`** (future - for external sources)
```sql
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('google_analytics', 'meta_pixel', 'postgres', 'mysql', 'csv_upload', 'csv_url')),
    credentials JSONB, -- Encrypted
    config JSONB DEFAULT '{}',
    column_config JSONB DEFAULT '{}',
    schedule_config JSONB DEFAULT '{}',
    sync_schedule VARCHAR(50) DEFAULT 'manual',
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'idle',
    table_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    column_definitions JSONB NOT NULL,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50),
    records_imported INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    error_message TEXT
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data sources" ON data_sources FOR ALL USING (auth.uid() = user_id);
```

**Components** in `src/components/data-sources/`:
- DataSourceList.tsx, DataSourceCard.tsx
- DataSourceWizard.tsx (7-step flow)
- DataPreviewModal.tsx, ColumnConfigurator.tsx
- CleaningRuleEditor.tsx, ScheduleConfigurator.tsx
- CsvUploader.tsx, DatabaseConnector.tsx
- SyncHistory.tsx

### 2.2 Campaign Management

**Database Migration: `005_campaigns.sql`**
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('sms', 'email')),
    status VARCHAR(50) DEFAULT 'draft',
    content TEXT,
    subject TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('sms', 'email')),
    subject TEXT,
    content TEXT NOT NULL,
    variables TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consented_at TIMESTAMPTZ,
    opt_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaigns" ON campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON templates FOR ALL USING (auth.uid() = user_id);
```

**Components** in `src/components/campaigns/`:
- CampaignList.tsx, CampaignCard.tsx, CampaignForm.tsx
- CampaignPreview.tsx, CampaignStatus.tsx
- TemplateSelector.tsx, TemplateEditor.tsx
- VariableInserter.tsx, CharacterCounter.tsx
- SchedulePicker.tsx

**Pages:**
- CampaignsPage.tsx, CreateCampaignPage.tsx
- CampaignDetailPage.tsx, TemplatesPage.tsx

### Exit Criteria
- [ ] Connect CSV upload working
- [ ] Connect PostgreSQL database
- [ ] Data preview shows top 10 rows
- [ ] Column configuration (rename, type, exclude)
- [ ] Cleaning rules apply
- [ ] Schedule sync working
- [ ] Create SMS/Email campaigns
- [ ] Template management
- [ ] Campaign scheduling
- [ ] Character counter for SMS

---

## Phase 3: Messaging & Launch (Week 5-6)

### 3.1 Messaging Integration

**Database Migration: `006_messages.sql`**
```sql
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_sid VARCHAR(100) UNIQUE,
    status VARCHAR(50),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    message_id VARCHAR(255) UNIQUE,
    status VARCHAR(50),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_messages_campaign ON sms_messages(campaign_id);
CREATE INDEX idx_email_messages_campaign ON email_messages(campaign_id);
```

**Edge Functions** in `supabase/functions/`:
- send-sms/index.ts (Twilio)
- send-email/index.ts (SendGrid)
- twilio-webhook/index.ts
- sendgrid-webhook/index.ts
- process-campaign/index.ts

**Services:**
- smsService.ts (TCPA consent check, quiet hours)
- emailService.ts (CAN-SPAM compliance)
- deliveryService.ts

### 3.2 Admin Portal

**Database Migration: `007_app_settings.sql`**
```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    sendgrid_api_key TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    monthly_sms_limit INTEGER DEFAULT 10000,
    monthly_email_limit INTEGER DEFAULT 50000,
    data_retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings" ON app_settings FOR ALL USING (
    (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
);
```

**Components** in `src/components/admin/`:
- UserList.tsx, UserForm.tsx, RoleSelect.tsx
- SettingsForm.tsx, IntegrationSettings.tsx
- AuditLogViewer.tsx

**Pages:**
- admin/UserManagementPage.tsx
- admin/SettingsPage.tsx

### 3.3 User Testing & Polish
- Test with 3-5 real users
- Fix bugs and UX issues
- Performance optimization
- Error handling improvements

### Compliance Checkpoint
- [ ] TCPA: Prior consent before SMS
- [ ] TCPA: STOP opt-out honored
- [ ] TCPA: 8 AM - 9 PM recipient timezone
- [ ] CAN-SPAM: Physical address in emails
- [ ] CAN-SPAM: Clear unsubscribe

### Exit Criteria
- [ ] Send SMS via Twilio
- [ ] Send Email via SendGrid
- [ ] Webhook processing for delivery status
- [ ] Message tracking in UI
- [ ] Admin can manage users (3-tier RBAC)
- [ ] Admin can configure settings
- [ ] 3-5 users validated workflow
- [ ] No critical bugs

---

# Post-MVP Add-on Phases

> **Note**: Implement these only after MVP is complete and validated with users.

## Phase A: Visual Builders (2 weeks)

### Dependencies
```bash
npm install reactflow @reactflow/node-toolbar @reactflow/minimap @reactflow/controls
```

### Database Migration: `008_visual_builders.sql`
- campaign_flows (React Flow nodes/edges)
- flow_executions (execution tracking)
- audience_segments (visual rules)
- segment_membership
- custom_dashboards (widget layouts)

### Components
- Campaign Flow Builder (trigger → condition → action nodes)
- Audience Segment Builder (AND/OR rule groups)
- Dashboard Builder (drag-and-drop widgets)

See `build-docs/10-future/visual-builders.md` for details.

---

## Phase B: Social Media (2 weeks)

### Dependencies
```bash
npm install oauth4webapi
```

### Database Migration: `009_social_media.sql`
- social_accounts (OAuth tokens)
- social_posts (scheduled/published)
- social_engagement (metrics)

### Supported Platforms
- Facebook Pages
- Instagram Business
- LinkedIn Company Pages
- X/Twitter

See `build-docs/10-future/social-media-integration.md` for details.

---

## Phase C: AI Assistant (2 weeks)

### Dependencies
```bash
npm install openai @anthropic-ai/sdk
```

### Database Migration: `010_ai_assistant.sql`
- ai_providers (BYOK configuration)
- ai_conversations (threads)
- ai_messages (chat history)
- ai_token_usage (tracking)
- ai_suggestions (actionable outputs)
- ai_usage_limits (role-based)

### Supported Providers (BYOK)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3)
- Ollama (self-hosted)
- Azure OpenAI
- Custom OpenAI-compatible

See `build-docs/10-future/ai-assistant.md` for details.

---

## Phase D: Enterprise Features (as needed)

### Features
- Multi-instance white-label architecture
- Full GDPR compliance (export, erasure, portability)
- SOC 2 controls (7-year audit retention)
- MFA for all users
- 6-tier RBAC (Owner > Admin > Manager > Support > User > Viewer)
- Instance provisioning scripts

See `build-docs/10-future/` for detailed documentation:
- advanced-compliance.md
- multi-instance-strategy.md

---

## Migration Summary

### MVP Migrations - Completed

| # | Migration | Status | Description |
|---|-----------|--------|-------------|
| 1 | rate_limiting | ✅ Done | Login attempt tracking |
| 2 | audit_logs | ✅ Done | Audit logging (30-day retention) |
| 4 | sites_members | ✅ Done | CRM: Multi-site member management |
| 5 | member_transactions_visits | ✅ Done | CRM: LTV calculation, visit tracking |
| 6 | consent_automation | ✅ Done | CRM: TCPA/CAN-SPAM consent, automation |

### MVP Migrations - Remaining

| # | Migration | Sprint | Description |
|---|-----------|--------|-------------|
| 7 | campaigns | 2 | Campaign management + templates |
| 8 | messages | 3 | Message delivery tracking |
| 9 | app_settings | 4 | Application settings, API credentials |

### Post-MVP Migrations

| # | Migration | Phase | Description |
|---|-----------|-------|-------------|
| 10 | visual_builders | A | Flow, segment, dashboard builders |
| 11 | social_media | B | Social account connections |
| 12 | ai_assistant | C | AI providers, conversations, tokens |
| 13 | profiles | D | Extended user profiles |
| 14 | instance_config | D | White-label configuration |
| 15 | mfa | D | MFA recovery codes |
| 16 | gdpr | D | Full GDPR data requests |

---

## Success Criteria

### MVP

**CRM Module** ✅ Complete:
- [x] Multi-site member management
- [x] Membership levels with benefits
- [x] Member import with cleaning rules
- [x] LTV and transaction tracking
- [x] Visit tracking
- [x] TCPA/CAN-SPAM consent management at database level
- [x] Automation trigger definitions

**Dashboard** ⏳ In Progress:
- [x] UI components complete (metrics, charts, tables)
- [ ] Connected to real CRM data
- [ ] Date range filtering with real data

**Data Import** ⏳ Partial:
- [x] Import services (cleaning, scheduling)
- [ ] Data Sources UI components
- [ ] GA4 and Meta Pixel connectors

**Campaigns** ❌ Not Started:
- [ ] SMS/Email campaigns can be created and sent
- [ ] Template management
- [ ] Twilio/SendGrid integration

**Admin Portal** ❌ Not Started:
- [ ] Admin can manage users (Admin/User/Viewer)
- [ ] Admin can configure settings

**Validation:**
- [ ] 3-5 users validated the workflow
- [ ] No critical bugs

### Post-MVP
- [ ] Phase A: Visual builders operational
- [ ] Phase B: Social posting to 4 platforms
- [ ] Phase C: AI assistant with BYOK
- [ ] Phase D: Enterprise features as needed
