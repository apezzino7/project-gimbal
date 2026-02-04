# Project Gimbal

**Internal Analytics & Marketing Campaign Platform**

Project Gimbal is an internal company platform for analytics dashboards and marketing campaign management. The MVP focuses on data import, campaign management (SMS/Email), and user-friendly dashboards.

## Features

### MVP Core
- **📊 Analytics Dashboard**: Real-time data visualization and reporting
- **📥 Data Import**: Connect CSV, PostgreSQL, GA4, Meta Pixel with scheduled syncs
- **📧 Email Campaigns**: SendGrid-powered email marketing with templates
- **📱 SMS Campaigns**: Twilio-integrated text message campaigns
- **⚙️ Admin Portal**: User management and application settings

### Post-MVP Add-ons
- **🔧 Visual Builders**: Drag-and-drop campaign flows, audience segments, and custom dashboards (Phase A)
- **📣 Social Media**: Direct posting to Facebook, Instagram, LinkedIn, and X/Twitter (Phase B)
- **🤖 AI Assistant**: BYOK (Bring Your Own Key) AI with OpenAI, Anthropic, or Ollama support (Phase C)
- **🏢 Enterprise**: Multi-instance white-label, MFA, full GDPR/SOC 2 compliance (Phase D)

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd project-gimbal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

## Technology Stack

- **Frontend**: React 19 + TypeScript 5 (strict) + Vite 7 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: Zustand + React Query
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Messaging**: Twilio (SMS), SendGrid (Email)
- **Testing**: Vitest, React Testing Library, Cypress
- **Monitoring**: Sentry

## Project Structure

```
src/
├── components/      # Reusable UI components
├── pages/           # Page-level components
├── services/        # API clients and services
├── hooks/           # Custom React hooks
├── stores/          # Zustand stores
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── config/          # Configuration
└── lib/             # External library clients

build-docs/          # Comprehensive documentation
supabase/            # Database migrations and Edge Functions
```

## Documentation

- **[PLAN.md](./PLAN.md)** - Development plan and MVP scope
- **[phases.md](./phases.md)** - Detailed implementation roadmap
- **[build-docs/](./build-docs)** - Comprehensive technical documentation

### Key Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](./build-docs/01-architecture/architecture-overview.md) | System design and architecture |
| [Security & Compliance](./build-docs/05-security-compliance/security-compliance.md) | TCPA/CAN-SPAM compliance |
| [Database Implementation](./build-docs/06-backend/database-implementation.md) | Database schema and RLS |
| [Future Features](./build-docs/10-future/README.md) | Post-MVP add-on modules |

## Development

### Available Scripts

```bash
npm run dev          # Development server (Vite)
npm run build        # Type-check + production build
npm run test         # Run unit tests (Vitest)
npm run test:ui      # Tests with interactive UI
npm run test:coverage # Coverage report (target: 70%+)
npm run lint         # ESLint
```

### MVP Timeline (6 Weeks)

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1-2 | Foundation + Dashboard | Components, state management, Recharts analytics |
| 3-4 | Data Import + Campaigns | Import wizard, campaign CRUD, templates |
| 5-6 | Messaging + Launch | Twilio SMS, SendGrid Email, user validation |

### Architecture

- **Single-tenant**: Single Supabase instance with RLS-based data isolation
- **3-tier RBAC**: Admin > User > Viewer
- **30-day audit retention** (MVP); 7-year for future SOC 2 compliance

## Compliance

| Standard | MVP Scope |
|----------|-----------|
| **TCPA** | Prior SMS consent, opt-out honored, 8 AM - 9 PM quiet hours |
| **CAN-SPAM** | Physical address, clear unsubscribe, 10-day honor window |

Full GDPR and SOC 2 compliance deferred to Phase D (Enterprise).

## Contributing

1. Read the [phases.md](./phases.md) for implementation details
2. Follow the patterns in [build-docs/02-development/](./build-docs/02-development/)
3. Ensure tests pass before submitting PRs

### Code Standards

- TypeScript strict mode
- ESLint + Prettier enforcement
- 70%+ test coverage

## License

[Specify your license here]

---

**Built with:** React · TypeScript · Vite · Supabase · Tailwind CSS
