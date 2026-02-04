# Future Features Documentation

This directory contains documentation for features planned for post-MVP phases.

## Overview

The MVP focuses on:
- **Data Import** (CSV, databases, scheduled syncs)
- **Campaign Management** (SMS + Email)
- **Dashboard Analytics**
- **Basic Admin Portal**

Features in this directory are planned for future phases after MVP validation with 3-5 users.

---

## Future Phases

### Phase A: Visual Builders (2 weeks)
Drag-and-drop visual editors for campaign automation and audience management.

- [Visual Builder Suite](./visual-builders.md)
  - Campaign Flow Builder (React Flow)
  - Audience Segment Builder
  - Dashboard Builder

### Phase B: Social Media Integration (2 weeks)
Direct posting and scheduling to social media platforms.

- [Social Media Integration](./social-media-integration.md)
  - Facebook/Instagram (Graph API)
  - LinkedIn (Marketing API)
  - X/Twitter (V2 API)

### Phase C: AI Assistant (2 weeks)
BYOK (Bring Your Own Key) AI integration for content generation and insights.

- [AI Assistant Module](./ai-assistant.md)
  - OpenAI, Anthropic, Ollama support
  - Campaign content generation
  - Analytics insights and recommendations

### Phase D: Enterprise Features (As needed)
Features for scaling to multi-tenant white-label deployment.

- [Multi-Instance Strategy](./multi-instance-strategy.md)
  - White-label provisioning
  - Separate Supabase instances per customer
  - Custom branding per instance

- [Advanced Compliance](./advanced-compliance.md)
  - SOC 2 Type II controls
  - 7-year audit log retention
  - Full GDPR implementation
  - MFA for all users

---

## When to Implement

1. **Complete MVP** and validate with 3-5 internal users
2. **Prioritize** based on user feedback and business needs
3. **Each phase** is approximately 2 weeks of development
4. **Phase D** (Enterprise) only if scaling to external customers

---

## Implementation Notes

### Prerequisites
Before starting any future phase:
- MVP must be stable and tested
- User feedback collected and analyzed
- Database migrations planned and reviewed

### Migration Path
Each phase has its own database migration (MVP ends at 007):
- Phase A: `008_visual_builders.sql`
- Phase B: `009_social_media.sql`
- Phase C: `010_ai_assistant.sql`
- Phase D: `011_enterprise.sql`

### Dependencies
| Phase | New Dependencies |
|-------|------------------|
| A | `reactflow`, `@reactflow/*` |
| B | `oauth4webapi` (optional) |
| C | `openai`, `@anthropic-ai/sdk` (optional) |
| D | Supabase Management API |

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| visual-builders.md | Complete | - |
| social-media-integration.md | Complete | - |
| ai-assistant.md | Complete | - |
| multi-instance-strategy.md | Complete | - |
| advanced-compliance.md | Draft | - |
