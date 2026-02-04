# Advanced Compliance (Future Feature)

> **Note**: This document describes enterprise compliance features planned for Phase D.
> The current MVP uses simplified compliance (30-day audit retention, 3-tier RBAC).

## Overview

When Project Gimbal scales to external customers or requires enterprise certifications, the following compliance features will be implemented.

---

## SOC 2 Type II Controls

### Audit Logging
- **Retention**: 7 years (upgrade from 30 days)
- **Events**: All 20+ audit event types
- **Storage**: Partitioned tables for performance
- **Export**: On-demand audit reports

### Access Controls
- **MFA Required**: All users (not just admins)
- **Session Management**: 15-minute access tokens, strict inactivity timeout
- **IP Allowlisting**: Restrict access by IP range
- **SSO Integration**: SAML 2.0 / OIDC support

### Change Management
- **Approval Workflows**: Changes require manager approval
- **Rollback Capabilities**: Database point-in-time recovery
- **Configuration Versioning**: Track all setting changes

---

## Full GDPR Implementation

### Current MVP State
- Basic consent management (checkbox on signup)
- TCPA/CAN-SPAM compliance for messaging

### Phase D Additions

#### Right to Access (Article 15)
```typescript
// Data export endpoint
POST /api/gdpr/export
Response: JSON/CSV file with all user data
```

#### Right to Erasure (Article 17)
```typescript
// Account deletion flow
POST /api/gdpr/delete-request
// 30-day soft delete → permanent purge
```

#### Right to Portability (Article 20)
- Machine-readable export format (JSON)
- Include all campaigns, contacts, analytics

#### Consent Management UI
- Granular consent tracking
- Consent withdrawal workflow
- Audit trail for all consent changes

#### Data Breach Procedures
- 72-hour notification workflow
- Breach impact assessment template
- Affected user notification system

---

## Enhanced RBAC

### Current MVP: 3 Tiers
```
Admin > User > Viewer
```

### Phase D: 6 Tiers
```
Owner > Admin > Manager > Support > User > Viewer

Owner:    Instance management, billing, all permissions
Admin:    User management, settings, all features
Manager:  Campaign management, team oversight
Support:  Read access, limited campaign actions
User:     Create/manage own campaigns
Viewer:   Read-only reports and analytics
```

### Permission Matrix

| Permission | Owner | Admin | Manager | Support | User | Viewer |
|------------|-------|-------|---------|---------|------|--------|
| Instance Config | ✓ | | | | | |
| User Management | ✓ | ✓ | | | | |
| All Campaigns | ✓ | ✓ | ✓ | R | | |
| Own Campaigns | ✓ | ✓ | ✓ | R | ✓ | R |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | R | R | | |

---

## Database Migrations

### Upgrade Audit Retention

```sql
-- Phase D Migration: Upgrade audit log retention
-- Changes: 30 days → 7 years with partitioning

-- Create partitioned audit_logs table
CREATE TABLE audit_logs_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create yearly partitions
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
-- ... continue for 7 years

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_user ON audit_logs_partitioned(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event ON audit_logs_partitioned(event_type, created_at DESC);

-- Migrate existing data
INSERT INTO audit_logs_partitioned SELECT * FROM audit_logs;

-- Rename tables
ALTER TABLE audit_logs RENAME TO audit_logs_old;
ALTER TABLE audit_logs_partitioned RENAME TO audit_logs;
```

### Add Enhanced RBAC

```sql
-- Phase D Migration: 6-tier RBAC

-- Update roles table
INSERT INTO roles (name, permissions) VALUES
    ('owner', '["*"]'),
    ('admin', '["users.*", "campaigns.*", "reports.*", "settings.*"]'),
    ('manager', '["campaigns.*", "reports.*", "analytics.*", "team.read"]'),
    ('support', '["campaigns.read", "reports.read", "analytics.read"]'),
    ('user', '["campaigns.own.*", "reports.read", "analytics.read"]'),
    ('viewer', '["reports.read", "analytics.read"]')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;
```

---

## Implementation Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Audit Upgrade | 7-year retention, partitioned tables |
| 2 | GDPR Export | Data export endpoint, UI |
| 3 | GDPR Erasure | Deletion workflow, 30-day purge |
| 4 | Enhanced RBAC | 6-tier roles, permission matrix |
| 5 | MFA All Users | Enforce MFA, recovery codes |
| 6 | SOC 2 Docs | Control documentation, evidence collection |

---

## Testing Requirements

### Compliance Testing
- [ ] Audit logs retained for 7 years (test with backfilled data)
- [ ] Data export includes all user data
- [ ] Deletion workflow completes in 30 days
- [ ] 6-tier RBAC permissions enforced correctly
- [ ] MFA required for all users

### Performance Testing
- [ ] Audit log queries perform well with 7 years of data
- [ ] Data export handles large datasets (100k+ contacts)
- [ ] Partitioned tables don't impact write performance

---

## References

- [GDPR Requirements](https://gdpr.eu/)
- [SOC 2 Compliance](https://www.aicpa.org/soc2)
- [TCPA Guidelines](https://www.fcc.gov/tcpa)
- [CAN-SPAM Act](https://www.ftc.gov/can-spam-act)
