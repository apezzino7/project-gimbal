# Architecture Overview

## System Architecture

Project Gimbal is an **internal company platform** for analytics dashboards and marketing campaign management. The MVP focuses on data import and campaign management with a single Supabase instance.

> **MVP Scope**: Single-tenant internal deployment. White-label multi-instance architecture is deferred to Phase D (Future).

## High-Level Architecture (MVP)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Internal Application                                │
│                                                                             │
│  ┌────────────────────┐         ┌─────────────────────────┐               │
│  │      Frontend      │────────▶│    Supabase Backend     │               │
│  │   React + Vite     │         │                         │               │
│  │                    │         │  ┌─────────────────┐    │               │
│  │  - Dashboard       │◀────────│  │   PostgreSQL    │    │               │
│  │  - Reports         │         │  │    Database     │    │               │
│  │  - Campaigns       │         │  └─────────────────┘    │               │
│  │  - Data Import     │         │                         │               │
│  │  - Admin Portal    │         │  ┌─────────────────┐    │               │
│  └────────────────────┘         │  │      Auth       │    │               │
│           │                     │  │    Service      │    │               │
│           │                     │  └─────────────────┘    │               │
│           │                     │                         │               │
│           └────────────────────▶│  ┌─────────────────┐    │               │
│                                 │  │  Edge Functions │    │               │
│                                 │  │   (Serverless)  │    │               │
│                                 │  └─────────────────┘    │               │
│                                 │                         │               │
│                                 │  ┌─────────────────┐    │               │
│                                 │  │     Storage     │    │               │
│                                 │  │  (Files/Media)  │    │               │
│                                 │  └─────────────────┘    │               │
│                                 └─────────────────────────┘               │
│                                            │                               │
└────────────────────────────────────────────┼───────────────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
    ┌─────────▼─────────┐       ┌───────────▼───────────┐      ┌──────────▼──────────┐
    │  Messaging APIs   │       │   Data Source APIs    │      │   Monitoring/Ops    │
    │      (MVP)        │       │       (MVP)           │      │                     │
    │ ┌──────────────┐  │       │ ┌─────────────────┐   │      │ ┌─────────────────┐ │
    │ │    Twilio    │  │       │ │ Google Analytics│   │      │ │     Sentry      │ │
    │ │    (SMS)     │  │       │ │       (GA4)     │   │      │ │   (Errors)      │ │
    │ └──────────────┘  │       │ └─────────────────┘   │      │ └─────────────────┘ │
    │                   │       │                       │      │                     │
    │ ┌──────────────┐  │       │ ┌─────────────────┐   │      │ ┌─────────────────┐ │
    │ │  SendGrid    │  │       │ │   Meta Pixel    │   │      │ │   Cloudflare    │ │
    │ │   (Email)    │  │       │ │   (Facebook)    │   │      │ │     (CDN)       │ │
    │ └──────────────┘  │       │ └─────────────────┘   │      │ └─────────────────┘ │
    └───────────────────┘       │                       │      └─────────────────────┘
                                │ ┌─────────────────┐   │
                                │ │  CSV / Custom   │   │
                                │ │    Database     │   │
                                │ └─────────────────┘   │
                                └───────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                        Post-MVP Add-on Modules                          │
    │  (Phase A: Visual Builders, Phase B: Social Media, Phase C: AI BYOK)    │
    └─────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer
- **Technology**: React 18 + TypeScript + Vite
- **Routing**: React Router v6
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS with custom design system
- **Data Visualization**: Recharts for charts and graphs
- **Form Handling**: React Hook Form with Zod validation

### Backend Layer (Supabase)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth (JWT-based)
- **API**: Auto-generated REST API + Real-time subscriptions
- **Functions**: Edge Functions for custom business logic
- **Storage**: Supabase Storage for file uploads

## Data Flow Architecture

### Read Operations
```
User Action → React Component → Supabase Client → PostgreSQL
     ↓
  Update UI State ← Transform Data ← JSON Response
```

### Write Operations
```
User Input → Form Validation → Supabase Client → Edge Function (validation)
     ↓                                                    ↓
Error Handling                                    PostgreSQL Insert
     ↓                                                    ↓
  Success/Error Message ← JSON Response ← RLS Check
```

### Real-time Updates
```
Database Change → PostgreSQL Trigger → Supabase Realtime
                                              ↓
                                    WebSocket to Client
                                              ↓
                                      React State Update
```

## Module Architecture

### MVP Core Modules (6 Weeks)

#### 1. Authentication Module
- User login/logout with Supabase Auth
- Session management (PKCE flow)
- Role-based access control: **3-tier (Admin/User/Viewer)**
- Token refresh mechanisms (automatic via Supabase)
- Password reset flows

#### 2. Dashboard Module
- Analytics visualization with Recharts
- Key metrics summary cards
- Trend charts and graphs
- Date range filtering
- Real-time data updates

#### 3. Reports Module
- Report generation engine
- Template management
- Export functionality (PDF, CSV, Excel)
- Scheduled reports

#### 4. Data Import Module (MVP Week 3-4)
- External data source connections (GA4, Meta Pixel, custom databases)
- OAuth2 authentication flows
- Manual and scheduled sync operations
- Data normalization and transformation
- Sync history and error logging
- Connection wizard with guided setup

#### 5. Campaign Management Module
- Campaign creation and editing
- SMS campaign builder (Twilio)
- Email campaign builder (SendGrid)
- Template library with variable insertion
- Campaign scheduling
- TCPA/CAN-SPAM compliance enforcement

#### 6. Admin Portal Module
- User management (CRUD, role assignment)
- Application settings
- Integration configurations (Twilio, SendGrid)

### Post-MVP Add-on Modules

> **Note**: These modules are implemented after MVP validation with 3-5 users.

#### Phase A: Visual Builder Suite (2 weeks post-MVP)
- **Campaign Flow Builder**: Drag-and-drop workflow automation with React Flow
  - Trigger nodes (manual, scheduled, event, segment entry)
  - Condition nodes (if/else, A/B split, wait/delay)
  - Action nodes (send SMS, email, social post, webhook)
  - Flow testing and analytics
- **Audience Segment Builder**: Visual rule composer
  - AND/OR/NOT logic groups
  - Field operators (equals, contains, greater than, etc.)
  - Real-time segment size estimation
  - Dynamic membership updates
- **Dashboard Builder**: Custom analytics dashboard creator
  - Widget library (metrics, charts, tables, text)
  - Grid-based drag-and-drop layout
  - Data source configuration
  - Dashboard sharing

#### Phase B: Social Media Module (2 weeks post-MVP)
- Multi-platform account management (Facebook, Instagram, LinkedIn, X/Twitter)
- OAuth2 account connections
- Unified post composer with platform previews
- Multi-platform scheduling and publishing
- Engagement metrics tracking
- Social calendar view

#### Phase C: AI Assistant Module (BYOK) (2 weeks post-MVP)
- Bring Your Own Key model (users provide their own AI API keys)
- Supported providers: OpenAI, Anthropic, Ollama, Azure OpenAI, custom endpoints
- Context-aware conversations (campaign, analytics, strategy, content)
- AI-generated suggestions with one-click apply
- Token usage tracking per user
- Role-based usage limits

#### Phase D: Enterprise Features (as needed)
- Multi-instance white-label architecture
- Full GDPR compliance (export, erasure, portability)
- SOC 2 controls (7-year audit retention)
- MFA for all users
- 6-tier RBAC (Owner > Admin > Manager > Support > User > Viewer)

### Supporting Modules

#### 10. Notification System
- In-app notifications
- Email notifications
- SMS notifications
- Notification preferences

#### 11. Audit Log System
- User activity tracking
- Data change logging
- Security event logging
- Compliance reporting

## Database Architecture

### Schema Design Principles
- **Single-tenant**: User-based data isolation via RLS (MVP)
- Row-Level Security for data access control
- Optimized indexes for query performance
- JSONB for flexible metadata storage
- Audit trails (30-day retention for MVP)

### MVP Tables

**Core Tables:**
- `auth.users` - Supabase-managed user accounts (roles in user_metadata)
- `campaigns` - Marketing campaigns (SMS, email)
- `sms_messages` / `email_messages` - Message tracking
- `analytics_data` - Metrics and analytics
- `reports` - Generated reports
- `templates` - Message templates
- `audit_logs` - Security and debugging logs (30-day retention)
- `app_settings` - Application configuration

**Data Import Tables (MVP Week 3-4):**
- `data_sources` - External data connections (GA4, Meta, databases)
- `import_tables` - Registry of dynamically created tables
- `imported_data` - Normalized imported metrics
- `sync_logs` - Sync history and status

### Post-MVP Tables

**Visual Builder Tables (Phase A):**
- `campaign_flows` - React Flow workflow definitions
- `flow_executions` - Flow execution tracking
- `audience_segments` - Dynamic segment rules
- `segment_membership` - Contact-segment relationships
- `custom_dashboards` - User dashboard layouts

**Social Media Tables (Phase B):**
- `social_accounts` - OAuth credentials for social platforms
- `social_posts` - Scheduled and published posts
- `social_engagement` - Post engagement metrics

**AI Assistant Tables (Phase C):**
- `ai_providers` - User's AI provider configurations (BYOK)
- `ai_conversations` - Conversation threads with context
- `ai_messages` - Individual chat messages
- `ai_token_usage` - Per-user daily token tracking
- `ai_suggestions` - Actionable AI outputs
- `ai_usage_limits` - Role-based token limits

**Enterprise Tables (Phase D):**
- `profiles` - Extended user profiles
- `instance_config` - White-label configuration
- `mfa_recovery_codes` - MFA backup codes

## Security Architecture

### Authentication Flow (Handled Automatically by Supabase)
```
1. User calls: supabase.auth.signInWithPassword({ email, password })
2. Supabase Auth validates credentials
3. Supabase automatically:
   - Generates JWT + refresh token
   - Stores tokens securely in localStorage
   - Sets up session
   - Manages token refresh in background
4. All API requests automatically include JWT (Supabase client handles this)
5. RLS policies validate user permissions
6. No manual token management needed—Supabase handles everything
```

**Key Point**: You never touch JWTs directly. The Supabase client abstracts all token management.

### Data Security Layers
1. **Network Layer**: HTTPS/TLS 1.3
2. **Application Layer**: JWT validation, CORS policies
3. **Database Layer**: Row-Level Security policies
4. **Encryption**: At-rest encryption (AES-256), in-transit (TLS)

## Integration Architecture

### SMS Integration (Twilio)
```
Campaign Trigger → Edge Function → Twilio API → SMS Delivery
                                         ↓
                              Webhook Callback
                                         ↓
                              Status Update in DB
```

### Email Integration (SendGrid)
```
Campaign Trigger → Edge Function → SendGrid API → Email Delivery
                                         ↓
                              Webhook Events
                                         ↓
                         Track Opens/Clicks in DB
```

### Data Import Integration
```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Import Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Manual/Scheduled Trigger                                        │
│          ↓                                                       │
│  Edge Function (sync-*)                                          │
│          ↓                                                       │
│  ┌───────┴───────┬───────────────┬────────────────┐             │
│  ↓               ↓               ↓                ↓              │
│  GA4 API    Meta API    Custom DB        REST API               │
│  (OAuth2)   (OAuth2)   (Connection)    (API Key)                │
│  ↓               ↓               ↓                ↓              │
│  └───────┬───────┴───────────────┴────────────────┘             │
│          ↓                                                       │
│  Normalize Data (ETL)                                            │
│          ↓                                                       │
│  imported_data table                                             │
│          ↓                                                       │
│  Dashboard Visualization                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Social Media Integration
```
┌─────────────────────────────────────────────────────────────────┐
│                 Social Publishing Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User composes post in Social Composer                           │
│          ↓                                                       │
│  Select platforms (Facebook, Instagram, LinkedIn, X)             │
│          ↓                                                       │
│  Schedule or publish immediately                                 │
│          ↓                                                       │
│  Edge Function (publish-*)                                       │
│          ↓                                                       │
│  ┌───────┴───────┬───────────────┬────────────────┐             │
│  ↓               ↓               ↓                ↓              │
│  Facebook    Instagram       LinkedIn         X/Twitter          │
│  Graph API   Graph API     Marketing API      API v2            │
│  (OAuth2)    (OAuth2)        (OAuth2)        (OAuth2)           │
│          ↓                                                       │
│  Store platform_post_id                                          │
│          ↓                                                       │
│  Fetch engagement metrics periodically                           │
│          ↓                                                       │
│  social_engagement table                                         │
└─────────────────────────────────────────────────────────────────┘
```

### AI Assistant Integration (BYOK)
```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Chat Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User sends message in AI Chat UI                                │
│          ↓                                                       │
│  Build context (analytics, campaign data)                        │
│          ↓                                                       │
│  Check usage limits (daily/monthly tokens)                       │
│          ↓                                                       │
│  Edge Function (ai-chat)                                         │
│          ↓                                                       │
│  Retrieve user's encrypted API key                               │
│          ↓                                                       │
│  ┌───────┴───────┬───────────────┬────────────────┐             │
│  ↓               ↓               ↓                ↓              │
│  OpenAI      Anthropic       Ollama        Azure/Custom         │
│  API          Messages      localhost       Endpoint            │
│          ↓                                                       │
│  Track token usage (input + output)                              │
│          ↓                                                       │
│  Parse suggestions from response                                 │
│          ↓                                                       │
│  Store in ai_messages + ai_suggestions                           │
│          ↓                                                       │
│  One-click apply to target module                                │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Single-Instance Model (MVP)
- Single Supabase project for all users
- User-based data isolation via Row-Level Security (RLS)
- Shared authentication realm
- Company domain (e.g., gimbal.company.com)
- Fixed company branding

> **Future (Phase D)**: White-label multi-instance architecture with separate Supabase project per customer. See `build-docs/10-future/multi-instance-strategy.md`.

### Infrastructure Components
- **Frontend Hosting**: Vercel/Netlify (static site)
- **Backend**: Supabase managed infrastructure
- **CDN**: Cloudflare or Vercel Edge Network
- **SSL**: Automatic SSL certificates

## Performance Architecture

### Caching Strategy
1. **Browser Cache**: Static assets (images, CSS, JS)
2. **API Cache**: Supabase Edge Functions cache
3. **Database Cache**: PostgreSQL query cache
4. **CDN Cache**: Global edge caching

### Optimization Techniques
- Code splitting and lazy loading
- Image optimization and lazy loading
- Database query optimization with indexes
- Connection pooling (PgBouncer via Supabase)
- Real-time subscription optimization

## Scalability Considerations

### Current Scale (< 1K users per instance)
- Standard Supabase tier sufficient
- No additional caching needed
- Single region deployment

### Future Scaling Path
- Upgrade Supabase tier for higher limits
- Implement Redis for session/cache
- Add read replicas for reporting queries
- CDN for global content delivery

## Monitoring & Observability

### Application Monitoring
- **Frontend**: Sentry for error tracking
- **Backend**: Supabase built-in monitoring
- **Performance**: Web Vitals tracking
- **Usage**: Custom analytics dashboard

### Logging Strategy
- **Application Logs**: Structured JSON logs
- **Audit Logs**: Database-backed audit trail
- **Error Logs**: Centralized in Sentry
- **Access Logs**: Supabase access logs

## Development Architecture

### Local Development
```
Developer Machine
    ↓
Vite Dev Server (localhost:5173)
    ↓
Supabase Development Project
    ↓
Local Supabase CLI (optional)
```

### CI/CD Pipeline
```
Git Push → GitHub Actions → Build & Test → Deploy to Staging
                                   ↓
                          Manual Approval (optional)
                                   ↓
                          Deploy to Production
```

## Technology Stack Summary

### Frontend
- React 19+ with TypeScript 5 (strict mode)
- Vite 7+
- Tailwind CSS 4+
- Zustand (global state management)
- React Query (server state)
- React Router 6+
- Recharts (data visualization)
- React Hook Form + Zod (forms and validation)
- React Flow (visual builders)

### Backend
- Supabase (managed BaaS)
- PostgreSQL 15+ with RLS
- Edge Functions (Deno runtime)
- Supabase Auth (PKCE flow)
- Supabase Storage
- pg_cron (scheduled tasks)

### Messaging Services
- Twilio (SMS)
- SendGrid or AWS SES (Email)

### Social Media APIs
- Facebook Graph API v18 (Facebook, Instagram)
- LinkedIn Marketing API v2
- X/Twitter API v2

### Data Source APIs
- Google Analytics 4 Data API
- Meta Marketing API
- Custom database connectors (PostgreSQL, MySQL)

### AI Providers (BYOK - User Provided)
- OpenAI API (GPT-4, GPT-3.5)
- Anthropic API (Claude 3)
- Ollama (self-hosted models)
- Azure OpenAI
- Custom OpenAI-compatible endpoints

### Monitoring & Operations
- Sentry (Error tracking)
- Cloudflare (CDN)
- Vercel/Netlify (Hosting)

### Development Tools
- ESLint + Prettier
- Vitest + React Testing Library
- Cypress (E2E testing)
- MSW (API mocking)
- GitHub Actions (CI/CD)
- Docker (optional local development)

## Design Patterns

### Frontend Patterns
- **Component Composition**: Reusable UI components
- **Custom Hooks**: Shared business logic
- **Context + Zustand**: Global state management
- **Render Props**: Flexible component APIs
- **HOC**: Cross-cutting concerns (auth, analytics)

### Backend Patterns
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware**: Request validation and auth
- **Event-Driven**: Webhooks and real-time updates

## Error Handling Strategy

### Frontend Error Boundaries
- Global error boundary for crashes
- Feature-level error boundaries
- Graceful degradation
- User-friendly error messages

### Backend Error Handling
- Structured error responses
- HTTP status codes
- Error logging to Sentry
- Retry mechanisms for external APIs

## Future Considerations

### Post-MVP Add-on Modules
| Phase | Feature | Timeline |
|-------|---------|----------|
| A | Visual Builders (React Flow) | 2 weeks post-MVP |
| B | Social Media Integration | 2 weeks post-MVP |
| C | AI Assistant (BYOK) | 2 weeks post-MVP |
| D | Enterprise Features | As needed |

See `build-docs/10-future/` for detailed documentation.

### Long-term Enhancements
- Push notification support
- Mobile app (React Native)
- Advanced ML predictions (churn, LTV, next best action)
- Multi-language support (i18n)
- Dark mode support
- Marketplace for third-party integrations
- White-label mobile SDK
- Advanced A/B testing framework
- Customer journey mapping

### Architectural Evolution
- Multi-instance white-label (Phase D)
- Microservices for complex features (if scale demands)
- Event sourcing for comprehensive audit trail
- CQRS for read-heavy analytics workloads
- GraphQL API layer (if needed)
- Redis for caching and session management (at scale)
