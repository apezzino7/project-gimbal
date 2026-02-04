# Project Gimbal Documentation

Welcome to the Project Gimbal documentation. This comprehensive guide covers all aspects of the internal analytics and marketing campaign platform.

## Quick Start

- **Understanding the architecture?** See [Architecture Overview](01-architecture/architecture-overview.md)
- **Developer onboarding?** Check [Engineering Choices](02-development/engineering-choices.md) and [Testing Strategy](09-testing/testing-strategy.md)
- **Security & Compliance?** Review [Security & Compliance](05-security-compliance/security-compliance.md)
- **Development Roadmap?** See [phases.md](../phases.md) for the detailed implementation plan
- **Future Features?** See [10-future/](10-future/README.md) for post-MVP add-on modules

## Project Overview

**Project Gimbal** is an internal company platform for analytics dashboards and marketing campaign management (SMS & Email). Built as a single-tenant application with user-based data isolation via RLS policies.

### MVP Core Features (6 Weeks)

- **Analytics Dashboard**: Real-time data visualization and reporting
- **Data Import**: CSV upload, PostgreSQL connections, scheduled syncs
- **Marketing Campaigns**: SMS and email campaign management with templates
- **Admin Portal**: User management, settings configuration
- **Compliance**: TCPA/CAN-SPAM enforcement

### Post-MVP Add-on Modules

- **Phase A - Visual Builders**: Campaign flows, audience segments, custom dashboards (React Flow)
- **Phase B - Social Media**: Facebook, Instagram, LinkedIn, X/Twitter integration
- **Phase C - AI Assistant**: BYOK (Bring Your Own Key) with OpenAI, Anthropic, Ollama
- **Phase D - Enterprise**: Multi-instance, MFA, full GDPR, SOC 2 (7-year retention)

See [10-future/](10-future/README.md) for detailed documentation on post-MVP features.

### Technology Stack

**MVP Stack:**
- **Frontend**: React 19 + TypeScript 5 (strict) + Vite 7 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: Zustand (global), React Query (server)
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Messaging**: Twilio (SMS), SendGrid (Email)
- **Hosting**: Vercel/Netlify + Supabase
- **Monitoring**: Sentry

**Post-MVP Tech:**
- Visual Builders: React Flow
- Social APIs: Facebook/Instagram Graph API, LinkedIn, X/Twitter
- AI Providers: OpenAI, Anthropic, Ollama (BYOK model)

## Documentation Structure

### 01. Architecture
System design, architecture patterns, and deployment models.

- [**Architecture Overview**](01-architecture/architecture-overview.md)
  - System architecture diagrams
  - Component interactions
  - Data flow patterns
  - Technology stack details

### 02. Development
Development practices, tooling, and code organization.

- [**Engineering Choices**](02-development/engineering-choices.md)
  - Frontend framework decisions
  - State management (Zustand)
  - Testing tools (Vitest, Cypress)
  - External services (Twilio, SendGrid)
  - Caching strategies

### 03. Design
Visual design system and UI components.

- [**Design System**](03-design/design-system.md)
  - Color palette
  - Typography
  - Component styles
  - Spacing system
  - Responsive breakpoints

### 04. Infrastructure
Deployment, hosting, and DevOps processes.

- [**Deployment Guide**](04-infrastructure/deployment-guide.md)
  - Environment setup
  - Supabase configuration
  - Frontend deployment (Vercel/Netlify)
  - DNS & SSL configuration
  - CI/CD pipelines

### 05. Security & Compliance
Security architecture, compliance requirements, and data protection.

- [**Security & Compliance**](05-security-compliance/security-compliance.md)
  - TCPA compliance (SMS consent, quiet hours)
  - CAN-SPAM compliance (unsubscribe, physical address)
  - Audit logging (30-day retention for MVP)
  - Input validation and sanitization
  - Rate limiting

- [**Authentication**](05-security-compliance/authentication.md)
  - Supabase Auth integration
  - 3-tier RBAC (Admin > User > Viewer)
  - JWT token management
  - Session handling

### 06. Backend
Database schema, API specifications, and backend services.

- [**Database Implementation**](06-backend/database-implementation.md)
  - PostgreSQL schema
  - Row-Level Security (RLS) policies
  - Tables for campaigns, analytics, audit logs
  - App settings configuration

- [**API Specification**](06-backend/api-specification.md)
  - RESTful API endpoints
  - Authentication methods
  - Request/response formats
  - Error handling
  - Rate limiting
  - Webhooks

### 07. Features
Feature-specific documentation and implementation details.

- [**Customer Admin Portal**](07-features/customer-admin-portal.md)
  - Admin dashboard
  - User management (3-tier RBAC)
  - Integration settings (Twilio, SendGrid)

- **Marketing Modules**
  - [**SMS Integration**](07-features/marketing-modules/sms-integration.md)
    - Twilio setup
    - Campaign sending
    - Opt-in/opt-out management
    - TCPA compliance
    - Delivery tracking

  - [**Email Integration**](07-features/marketing-modules/email-integration.md)
    - SendGrid setup
    - Template system (MJML)
    - Unsubscribe management
    - CAN-SPAM compliance
    - Deliverability best practices

- [**Data Import Framework**](07-features/data-import.md)
  - CSV upload and URL import
  - PostgreSQL/MySQL connections
  - Column configuration and cleaning rules
  - Scheduled syncs (hourly/daily/weekly)
  - Data preview and validation

### 08. Operations
Monitoring, observability, and operational procedures.

- [**Monitoring & Observability**](08-operations/monitoring-observability.md)
  - Sentry error tracking
  - Performance monitoring (Web Vitals)
  - Application metrics
  - Database monitoring
  - Logging strategy
  - Alerting rules

### 09. Testing
Testing strategies, tools, and best practices.

- [**Testing Strategy**](09-testing/testing-strategy.md)
  - Unit testing (Vitest)
  - Component testing (React Testing Library)
  - E2E testing (Cypress)
  - Integration testing
  - Performance testing (Lighthouse CI)
  - Accessibility testing

### 10. Future Features
Post-MVP add-on modules documentation.

- [**Future Features Index**](10-future/README.md)
  - Phase A: Visual Builders (React Flow)
  - Phase B: Social Media Integration
  - Phase C: AI Assistant (BYOK)
  - Phase D: Enterprise Features (Multi-instance, GDPR, SOC 2)

## Development Plan

See [phases.md](../phases.md) for the detailed implementation roadmap.

### MVP (6 Weeks)

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1-2 | Foundation + Dashboard | Components, state management, Recharts analytics |
| 3-4 | Data Import + Campaigns | Import wizard, campaign CRUD, templates |
| 5-6 | Messaging + Launch | Twilio SMS, SendGrid Email, user validation |

### Post-MVP Add-on Phases

| Phase | Feature | Timeline |
|-------|---------|----------|
| A | Visual Builders | 2 weeks |
| B | Social Media | 2 weeks |
| C | AI Assistant | 2 weeks |
| D | Enterprise Features | As needed |

## Key Workflows

### For Developers

1. **Local Development Setup**
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

2. **Making Changes**
   - Read [Engineering Choices](02-development/engineering-choices.md)
   - Follow [Testing Strategy](09-testing/testing-strategy.md)
   - Review [Design System](03-design/design-system.md)

3. **Testing**
   ```bash
   # Run unit tests
   npm run test

   # Run E2E tests
   npm run test:e2e

   # Run with coverage
   npm run test:coverage
   ```

### For Product/Business Teams

1. **Understanding the Platform**
   - Start with [Architecture Overview](01-architecture/architecture-overview.md)
   - Review [Customer Admin Portal](07-features/customer-admin-portal.md) features
   - Understand [Marketing Modules](07-features/marketing-modules/)

2. **Compliance**
   - Review [Security & Compliance](05-security-compliance/security-compliance.md)
   - Understand TCPA requirements for SMS
   - Review CAN-SPAM requirements for Email

## Configuration Reference

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# External Services (configured in admin settings)
# Twilio and SendGrid credentials stored encrypted in database

# Monitoring
VITE_SENTRY_DSN=<sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
```

See [Deployment Guide](04-infrastructure/deployment-guide.md#environment-setup) for complete reference.

## API Documentation

Comprehensive API documentation is available in [API Specification](06-backend/api-specification.md).

### Quick API Examples

```typescript
// Authentication
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Fetch campaigns
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('*')
  .eq('status', 'active');

// Send campaign
await supabase.functions.invoke('send-campaign', {
  body: { campaign_id: 'uuid' }
});
```

## Security & Compliance

Project Gimbal is designed to meet security and compliance requirements:

### MVP Compliance

| Standard | Requirements |
|----------|--------------|
| **TCPA** | Prior SMS consent, opt-out honored immediately, 8 AM - 9 PM quiet hours |
| **CAN-SPAM** | Physical address, clear unsubscribe, 10-day honor window |

### MVP Security

- 3-tier RBAC (Admin > User > Viewer)
- 30-day audit log retention
- PKCE authentication flow
- RLS policies for data isolation
- Input validation and sanitization
- Rate limiting on all endpoints

### Future Compliance (Phase D)

- Full GDPR (data export, erasure, portability)
- SOC 2 controls (7-year audit retention)
- MFA for all users

See [Security & Compliance](05-security-compliance/security-compliance.md) for details.

## Monitoring & Support

### Health & Status
- Health check endpoint: `https://gimbal.app/api/health`
- Sentry dashboard for error tracking
- Supabase dashboard for database metrics

### Support Contacts
- **Technical Issues**: Open GitHub issue
- **Security Issues**: security@company.com

## Contributing

### Code Standards
- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write tests for new features
- Document public APIs
- Follow conventional commits

### Pull Request Process
1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit PR for review
6. Address review feedback
7. Merge after approval

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
npm ci --force
rm -rf node_modules
npm install
npm run build
```

#### Database Connection Issues
- Check Supabase project status
- Verify connection string in environment variables
- Check RLS policies if queries return empty results

#### Authentication Issues
- Verify JWT token expiry
- Check RLS policies
- Confirm user roles and permissions

See [Deployment Guide - Troubleshooting](04-infrastructure/deployment-guide.md#troubleshooting) for more details.

## Additional Resources

### External Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Twilio API Reference](https://www.twilio.com/docs)
- [SendGrid API Reference](https://docs.sendgrid.com)
- [Vercel Documentation](https://vercel.com/docs)

### Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [TCPA Compliance Guide](https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts)
- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

### Design Resources
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MJML Email Templates](https://mjml.io)
- [Web Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | TBD | MVP release |
| 0.1.0 | Current | Development phase |

---

**Last Updated**: February 3, 2026
**Maintained by**: Project Gimbal Team
