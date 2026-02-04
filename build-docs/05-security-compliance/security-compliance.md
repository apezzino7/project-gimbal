# Security & Compliance

## Overview

Project Gimbal is designed with security in mind and implements compliance measures appropriate to its use case.

### MVP Compliance (Current)
- **TCPA**: SMS consent management and quiet hours
- **CAN-SPAM**: Email unsubscribe mechanisms
- **30-day audit retention**: For internal debugging and accountability
- **3-tier RBAC**: Admin > User > Viewer

### Future Compliance (Phase D)
- **Full GDPR**: Data export, erasure, portability workflows
- **SOC 2 Type II**: 7-year audit retention, comprehensive controls
- **MFA enforcement**: Required for all users

See [10-future/advanced-compliance.md](../10-future/advanced-compliance.md) for enterprise compliance roadmap.

## Compliance Requirements

### GDPR (General Data Protection Regulation)

#### Data Subject Rights
Project Gimbal implements the following GDPR rights:

1. **Right to Access (Art. 15)**
   - Users can download their data via Settings > Export Data
   - Full data export in machine-readable format (JSON/CSV)
   - Response time: Within 30 days

2. **Right to Rectification (Art. 16)**
   - Users can update their profile information
   - Admin can correct data on behalf of users
   - Audit trail of all modifications

3. **Right to Erasure (Art. 17)**
   - User account deletion workflow
   - Anonymization of historical data (for analytics integrity)
   - Retention of audit logs per legal requirements
   - Implementation: Soft delete with scheduled purge

4. **Right to Data Portability (Art. 20)**
   - Export in JSON, CSV formats
   - Includes all user-generated content
   - Includes campaign data and analytics

5. **Right to Object (Art. 21)**
   - Opt-out of marketing communications
   - Unsubscribe mechanisms in all emails/SMS
   - Preference center for granular control

6. **Right to Restrict Processing (Art. 18)**
   - Account suspension (data retained but not processed)
   - Campaign pause functionality
   - Data processing freeze option

#### GDPR Technical Implementation

```sql
-- Data subject request tracking
CREATE TABLE gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    request_type VARCHAR(50), -- access, erasure, portability, rectification
    status VARCHAR(50), -- pending, in_progress, completed, rejected
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    request_data JSONB,
    response_data JSONB,
    processed_by UUID REFERENCES users(id)
);

-- Consent management
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    consent_type VARCHAR(100), -- marketing, analytics, third_party
    consent_given BOOLEAN,
    consent_version VARCHAR(20),
    consented_at TIMESTAMP DEFAULT NOW(),
    withdrawn_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(100),
    retention_days INTEGER,
    deletion_method VARCHAR(50), -- hard_delete, anonymize, archive
    last_cleanup_at TIMESTAMP
);
```

#### GDPR Compliance Checklist

- [x] Privacy Policy published
- [x] Cookie consent banner
- [x] Data Processing Agreement (DPA) template
- [x] Data Subject Access Request (DSAR) workflow
- [x] Right to erasure implementation
- [x] Data portability export
- [x] Consent management system
- [x] Data breach notification procedure (72-hour rule)
- [x] Privacy by design principles
- [x] Data minimization practices
- [x] Purpose limitation enforcement
- [x] DPO contact information (if required)

### SOC 2 Type II Compliance

#### Trust Service Criteria

##### 1. Security (CC6)
- **CC6.1**: Logical and physical access controls
  - MFA for all admin accounts
  - Role-based access control (RBAC)
  - Regular access reviews
  - Principle of least privilege

- **CC6.2**: Access credentials management
  - Password complexity requirements
  - Regular password rotation (90 days)
  - Encrypted credential storage
  - Service account management

- **CC6.3**: Access removal
  - Automated deprovisioning on termination
  - Regular access audits
  - Session timeout enforcement

##### 2. Availability (A1)
- **Uptime SLA**: 99.9% (8.76 hours downtime/year)
- **Monitoring**: 24/7 automated monitoring
- **Incident Response**: < 1 hour response time
- **Backup Strategy**: Daily backups, 30-day retention
- **Disaster Recovery**: RTO < 4 hours, RPO < 1 hour

##### 3. Processing Integrity (PI1)
- **Data Validation**: Input validation on all forms
- **Error Handling**: Graceful error handling without data loss
- **Transaction Logging**: Audit trail of all data changes
- **Reconciliation**: Automated data integrity checks

##### 4. Confidentiality (C1)
- **Data Classification**: PII, confidential, public
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Access Controls**: Need-to-know basis
- **NDAs**: Required for all personnel

##### 5. Privacy (P1)
- **Privacy Notice**: Clear and accessible
- **Consent Management**: Documented and auditable
- **Data Retention**: Defined and enforced policies
- **Third-Party Management**: Vendor security assessments

#### SOC 2 Evidence Collection

```javascript
// Automated evidence collection
const soc2Evidence = {
  accessLogs: 'supabase_auth_logs',
  changeManagement: 'git_commit_history',
  backupVerification: 'automated_backup_tests',
  incidentResponse: 'incident_management_tickets',
  securityTraining: 'training_completion_records',
  vulnerabilityScans: 'weekly_security_scan_reports',
  penetrationTests: 'annual_pentest_reports',
  riskAssessments: 'quarterly_risk_reviews',
  businessContinuity: 'dr_test_results',
  vendorManagement: 'vendor_security_questionnaires'
};
```

## Security Architecture

### Authentication Security

#### Password Requirements
```javascript
// Password policy
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true, // no email, name in password
  maxAge: 90, // days
  historyCount: 5 // can't reuse last 5 passwords
};
```

#### Multi-Factor Authentication (MFA)
- **Methods**: TOTP (Google Authenticator, Authy), SMS
- **Enforcement**: Required for admin roles
- **Recovery**: Backup codes (10 single-use codes)
- **Implementation**: Supabase Auth MFA

#### Session Management
```javascript
const sessionConfig = {
  accessTokenTTL: '15m',
  refreshTokenTTL: '7d',
  inactivityTimeout: '30m',
  absoluteTimeout: '12h',
  maxConcurrentSessions: 3,
  sessionBindToIP: false, // for mobile users
  sessionBindToDevice: true
};
```

### Authorization & Access Control

#### Role-Based Access Control (RBAC)

**MVP: 3-Tier RBAC**

| Role | Description | Permissions |
|------|-------------|-------------|
| Admin | Full access | `["*"]` |
| User | Standard user | `["campaigns.*", "reports.*", "analytics.*"]` |
| Viewer | Read-only | `["reports.read", "analytics.read"]` |

```sql
-- Roles definition
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MVP roles (3-tier)
INSERT INTO roles (name, permissions) VALUES
('admin', '["*"]'), -- Full access
('user', '["campaigns.*", "reports.*", "analytics.*"]'),
('viewer', '["reports.read", "analytics.read"]');

-- Future: 6-tier RBAC for enterprise (Phase D)
-- See 10-future/advanced-compliance.md

-- Permission format: "resource.action"
-- Examples: users.create, campaigns.delete, reports.export
```

#### Row-Level Security (RLS) Policies

```sql
-- Example: Users can only see their own data
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
ON campaigns FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own campaigns"
ON campaigns FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaigns"
ON campaigns FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all campaigns"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'owner')
  )
);
```

### Data Security

#### Encryption

##### Encryption at Rest
- **Database**: Supabase automatic encryption (AES-256)
- **File Storage**: Supabase Storage encryption
- **Backups**: Encrypted backups
- **Sensitive Fields**: Additional column-level encryption for PII

```javascript
// Column-level encryption for sensitive data
import { createCipheriv, createDecipheriv } from 'crypto';

function encryptField(value, key) {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}
```

##### Encryption in Transit
- **HTTPS Only**: Enforced via HSTS headers
- **TLS 1.3**: Minimum version
- **Certificate Pinning**: For mobile apps
- **Secure WebSockets**: WSS for real-time features

#### Data Classification

```
CRITICAL (Red)
- Passwords, API keys, tokens
- Payment information
- SSN, government IDs
→ Encrypted at rest, strict access controls

CONFIDENTIAL (Orange)
- User PII (email, phone, name)
- Campaign content
- Analytics data
→ Encrypted at rest, role-based access

INTERNAL (Yellow)
- System logs
- Configuration data
→ Access controls, audit logging

PUBLIC (Green)
- Marketing materials
- Public-facing content
→ Standard security practices
```

#### Data Sanitization

```javascript
// Input validation and sanitization
import DOMPurify from 'dompurify';
import { z } from 'zod';

// Schema validation
const userInputSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  message: z.string().max(1000)
});

// XSS prevention
function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
}

// SQL injection prevention
// Using Supabase client (parameterized queries)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput); // Safe, parameterized
```

### Network Security

#### Firewall & DDoS Protection
- **CDN**: Cloudflare with DDoS protection
- **Rate Limiting**: Per IP and per user
- **WAF Rules**: OWASP Top 10 protection
- **Geo-Blocking**: Optional per instance

#### CORS Configuration

```javascript
// CORS policy
const corsConfig = {
  origin: [
    'https://*.gimbal.app',
    /^https:\/\/.*\.gimbal\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};
```

#### Security Headers

```javascript
// HTTP security headers
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co;
  `.replace(/\s+/g, ' ').trim()
};
```

### API Security

#### Rate Limiting

```javascript
// Rate limiting configuration
const rateLimits = {
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // requests per window
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 login attempts per 15 min
  },
  api: {
    windowMs: 60 * 1000,
    max: 100 // 100 API calls per minute
  },
  campaigns: {
    windowMs: 60 * 60 * 1000,
    max: 50 // 50 campaign sends per hour
  }
};
```

#### API Key Management

```sql
-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    key_hash TEXT NOT NULL, -- bcrypt hash
    key_prefix VARCHAR(10), -- First 8 chars for identification
    name VARCHAR(100),
    scopes JSONB, -- ["campaigns.read", "analytics.read"]
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Only show full key once at creation
-- Store only hash for validation
```

## Audit Logging

### Audit Trail Requirements

```sql
-- Comprehensive audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- login, create, update, delete, export
    resource_type VARCHAR(100), -- user, campaign, report
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(50), -- success, failure
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### Events to Audit

#### Security Events
- User login/logout (success and failure)
- Password changes
- MFA enrollment/removal
- Permission changes
- API key creation/revocation
- Session termination

#### Data Events
- PII access
- Data exports
- Bulk operations
- GDPR requests
- Data deletions
- Campaign sends

#### Administrative Events
- User creation/deletion
- Role assignments
- Configuration changes
- Integration changes
- Billing changes

### Log Retention

**MVP (Internal Project):**
- **Security Logs**: 30 days
- **Audit Logs**: 30 days
- **Application Logs**: 30 days
- **Access Logs**: 30 days

**Future (SOC 2 - Phase D):**
- Security/Audit Logs: 7 years
- See [10-future/advanced-compliance.md](../10-future/advanced-compliance.md)

## Vulnerability Management

### Security Scanning

```yaml
# GitHub Actions security scanning
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Dependency scanning
      - name: Run npm audit
        run: npm audit --audit-level=high

      # SAST scanning
      - name: Run CodeQL
        uses: github/codeql-action/analyze@v2

      # Secret scanning
      - name: TruffleHog scan
        uses: trufflesecurity/trufflehog@main

      # Container scanning (if using Docker)
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
```

### Dependency Management
- **Automated Updates**: Dependabot
- **Vulnerability Alerts**: GitHub Advanced Security
- **Update Schedule**: Weekly security patches, monthly minor updates
- **Testing**: Automated tests before applying updates

### Penetration Testing
- **Frequency**: Annual third-party pentest
- **Scope**: Full application and infrastructure
- **Follow-up**: Remediation within 30 days
- **Re-testing**: Verify fixes

## Incident Response

### Security Incident Response Plan

#### Phase 1: Detection (0-15 minutes)
1. Automated monitoring alerts
2. Manual reporting via security@gimbal.app
3. Initial triage and classification

#### Phase 2: Containment (15-60 minutes)
1. Isolate affected systems
2. Preserve evidence
3. Block malicious traffic
4. Revoke compromised credentials

#### Phase 3: Investigation (1-24 hours)
1. Determine scope and impact
2. Identify root cause
3. Document timeline
4. Assess data breach

#### Phase 4: Remediation (24-72 hours)
1. Apply security patches
2. Reset affected credentials
3. Restore from backups if needed
4. Implement additional controls

#### Phase 5: Recovery (72 hours+)
1. Resume normal operations
2. Monitor for recurrence
3. Validate fixes

#### Phase 6: Post-Incident (1-2 weeks)
1. Post-mortem analysis
2. Update security controls
3. Customer notification (if breach)
4. Regulatory notification (GDPR 72 hours)
5. Update documentation

### Data Breach Notification

```
GDPR Breach Criteria:
- Personal data compromised
- Risk to rights and freedoms of individuals

Notification Requirements:
- Supervisory Authority: Within 72 hours
- Affected Individuals: Without undue delay
- Content: Nature of breach, consequences, mitigation

Template stored in: /docs/templates/breach-notification.md
```

## Security Training

### Employee Security Training
- **Onboarding**: Security awareness training
- **Annual**: Refresher training and updates
- **Phishing**: Quarterly phishing simulations
- **Incident Response**: Annual tabletop exercises

### Development Security Training
- **Secure Coding**: OWASP Top 10 training
- **Code Review**: Security-focused reviews
- **Threat Modeling**: For new features
- **Security Champions**: Designated per team

## Third-Party Security

### Vendor Security Assessment

```markdown
## Vendor Security Questionnaire

1. SOC 2 certification status
2. Data encryption practices
3. Access controls and MFA
4. Incident response procedures
5. Data breach history
6. GDPR compliance
7. Business continuity plan
8. Insurance coverage
9. Subprocessor list
10. Data Processing Agreement

Approved Vendors:
- Supabase: SOC 2 Type II, GDPR compliant
- Twilio: SOC 2 Type II, HIPAA compliant
- SendGrid: SOC 2 Type II, GDPR compliant
- Sentry: SOC 2 Type II, GDPR compliant
- Vercel: SOC 2 Type II, GDPR compliant
```

### Data Processing Agreements (DPA)
- Required for all vendors processing personal data
- GDPR Article 28 compliance
- Standard Contractual Clauses for non-EU vendors
- Regular vendor audits

## Compliance Monitoring

### Continuous Compliance

```javascript
// Automated compliance checks
const complianceChecks = {
  daily: [
    'Backup verification',
    'SSL certificate expiry',
    'Failed login attempts',
    'Unusual API activity'
  ],
  weekly: [
    'Access review',
    'Vulnerability scan',
    'Patch compliance',
    'Log integrity'
  ],
  monthly: [
    'User access audit',
    'Vendor assessment review',
    'Security metrics review',
    'Policy review'
  ],
  quarterly: [
    'Risk assessment',
    'Compliance audit',
    'Disaster recovery test',
    'Security training'
  ],
  annually: [
    'SOC 2 audit',
    'Penetration test',
    'Policy updates',
    'Third-party security review'
  ]
};
```

### Compliance Reporting

- **SOC 2 Report**: Annual
- **GDPR Compliance Report**: On request
- **Security Metrics Dashboard**: Real-time
- **Incident Reports**: As needed
- **Audit Logs**: Available on demand

## Security Checklist

### Pre-Launch Security Checklist
- [ ] All dependencies up to date
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] RLS policies enabled
- [ ] Audit logging active
- [ ] Backup strategy tested
- [ ] Incident response plan documented
- [ ] Privacy policy published
- [ ] DPA templates ready
- [ ] Security monitoring configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error handling reviewed
- [ ] Secrets management configured
- [ ] Penetration test completed

### Ongoing Security Tasks
- [ ] Weekly dependency updates
- [ ] Monthly access reviews
- [ ] Quarterly security training
- [ ] Annual SOC 2 audit
- [ ] Annual penetration test
- [ ] Continuous vulnerability scanning
- [ ] Regular backup verification
- [ ] Incident response drills

---

## Extension Module Security

### Data Import Security (MVP)

#### OAuth Token Security
```javascript
// OAuth token storage requirements
const oauthTokenSecurity = {
  storage: 'Encrypted JSONB in data_sources.credentials',
  encryption: 'AES-256-GCM via pgcrypto',
  refresh: 'Automatic token refresh before expiry',
  revocation: 'Token revoked on account disconnect',
  neverExposed: 'Tokens never sent to frontend'
};
```

#### Credential Handling
- **Connection Strings**: Encrypted at rest, never logged
- **API Keys**: Encrypted storage, masked in UI (show last 4 chars only)
- **OAuth Tokens**: Encrypted with automatic refresh
- **Service Accounts**: Scoped to minimum required permissions

#### Data Import Validation
```javascript
// Validate imported data before storage
const importValidation = {
  schemaValidation: 'Validate data structure matches expected schema',
  sizeLimit: 'Max 100MB per sync operation',
  rowLimit: 'Max 1M rows per import',
  sqlInjection: 'All data parameterized, never interpolated',
  contentType: 'Validate data types match expected formats'
};
```

#### Third-Party API Security
- **Google Analytics**: OAuth2 with offline_access scope
- **Meta Pixel**: App-scoped tokens with limited permissions
- **Custom Databases**: Connection pooling, read-only accounts recommended

### Visual Builder Security (Phase A - Future)

#### Flow Definition Validation
```javascript
// Campaign flow validation rules
const flowValidation = {
  nodeLimit: 50,           // Max nodes per flow
  edgeLimit: 100,          // Max connections
  depthLimit: 20,          // Max nesting depth
  cyclePrevention: true,   // No circular references
  triggerRequired: true,   // Must have exactly one trigger
  actionRequired: true     // Must have at least one action
};
```

#### Input Sanitization
- **Node Labels**: Sanitized, max 100 characters
- **Condition Expressions**: Validated against safe operators only
- **Webhook URLs**: Validated URL format, HTTPS required
- **Template Content**: HTML sanitized with DOMPurify

#### Segment Builder Security
```javascript
// Segment rule validation
const segmentSecurity = {
  ruleDepth: 5,            // Max nested groups
  conditionsPerGroup: 20,   // Max conditions per group
  queryTimeout: '30s',      // Max segment calculation time
  estimateOnly: true        // Preview uses EXPLAIN, not full query
};
```

### Social Media Security (Phase B - Future)

#### OAuth Token Management
```sql
-- Token encryption pattern
-- Tokens encrypted using pgcrypto before storage
-- Key stored in secure environment variable

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt function (called from Edge Function)
CREATE OR REPLACE FUNCTION encrypt_social_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    encrypt(
      token::bytea,
      current_setting('app.encryption_key')::bytea,
      'aes-gcm'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Platform-Specific Security
| Platform | Token Expiry | Refresh | Permissions Required |
|----------|--------------|---------|---------------------|
| Facebook | 60 days | Auto | pages_manage_posts, pages_read_engagement |
| Instagram | 60 days | Auto (via Facebook) | instagram_basic, instagram_content_publish |
| LinkedIn | 60 days | Manual re-auth | w_member_social, r_organization_social |
| X/Twitter | No expiry | N/A | tweet.write, tweet.read |

#### Social Post Content Security
- **Content Validation**: Character limits enforced per platform
- **Media Validation**: File type whitelist, size limits
- **Link Validation**: No malicious URLs, link shortener checks
- **Hashtag Validation**: Sanitized, no XSS in hashtags

### AI Assistant Security (Phase C - Future)

#### BYOK API Key Security
```javascript
// API key handling requirements
const apiKeySecurity = {
  storage: 'Encrypted at rest using pgcrypto',
  transmission: 'Never sent to frontend, only backend Edge Functions',
  validation: 'Keys validated before saving',
  rotation: 'User can update key at any time',
  deletion: 'Key deleted when provider removed'
};
```

#### Request Proxying
```
User Request → Frontend (no API key) → Edge Function → Decrypt API Key
                                                           ↓
                                           Call AI Provider API
                                                           ↓
                                           Return Response (no key)
```

#### AI Data Isolation
- **Per-User Conversations**: All AI data isolated by user_id
- **No Cross-Training**: User data never used for AI training
- **Context Isolation**: Each conversation has separate context
- **No Shared Memory**: Conversations don't share state across users

#### Token Usage Tracking
```javascript
// Token tracking for accountability
const tokenTracking = {
  perRequest: 'Log input/output tokens per message',
  perDay: 'Aggregate daily usage per user',
  perMonth: 'Monthly totals for billing/limits',
  perProvider: 'Separate tracking per AI provider',
  costEstimate: 'Calculate estimated cost based on provider pricing'
};
```

#### Usage Limits Enforcement
```javascript
// Rate limit checks before AI requests
async function checkAILimits(userId) {
  const limits = await getUserLimits(userId);
  const usage = await getDailyUsage(userId);

  if (limits.dailyTokens && usage >= limits.dailyTokens) {
    throw new RateLimitError('Daily AI token limit exceeded');
  }

  if (limits.dailyRequests && usage.requests >= limits.dailyRequests) {
    throw new RateLimitError('Daily AI request limit exceeded');
  }

  return true;
}
```

#### AI Data GDPR Compliance
```javascript
// GDPR operations for AI data
const aiGdprOperations = {
  export: [
    'ai_providers (except encrypted keys)',
    'ai_conversations',
    'ai_messages',
    'ai_suggestions',
    'ai_token_usage'
  ],
  delete: [
    'ai_suggestions',
    'ai_messages',
    'ai_conversations',
    'ai_token_usage',
    'ai_providers'
  ],
  retention: '30 days after account deletion',
  audit: 'All AI operations logged to audit_logs'
};
```

#### AI Suggestion Content Security
- **Output Validation**: AI responses validated for structure
- **Content Filtering**: Block suggestions containing harmful content
- **Sanitization**: All text content sanitized before storage/display
- **Attribution**: Clear indication that content is AI-generated

### Extension Module Audit Events

```javascript
// Additional audit events for extension modules
const extensionAuditEvents = {
  // Data Import
  DATA_SOURCE_CREATED: 'New data source connected',
  DATA_SOURCE_DELETED: 'Data source disconnected',
  SYNC_STARTED: 'Data sync initiated',
  SYNC_COMPLETED: 'Data sync completed',
  SYNC_FAILED: 'Data sync failed',

  // Visual Builders
  FLOW_CREATED: 'Campaign flow created',
  FLOW_ACTIVATED: 'Campaign flow activated',
  FLOW_DEACTIVATED: 'Campaign flow deactivated',
  SEGMENT_CREATED: 'Audience segment created',
  DASHBOARD_SHARED: 'Dashboard shared with users',

  // Social Media
  SOCIAL_ACCOUNT_CONNECTED: 'Social account connected',
  SOCIAL_ACCOUNT_DISCONNECTED: 'Social account disconnected',
  SOCIAL_POST_PUBLISHED: 'Social post published',
  SOCIAL_POST_FAILED: 'Social post failed',

  // AI Assistant
  AI_PROVIDER_ADDED: 'AI provider configured',
  AI_PROVIDER_REMOVED: 'AI provider removed',
  AI_CONVERSATION_STARTED: 'AI conversation started',
  AI_SUGGESTION_APPLIED: 'AI suggestion applied to module',
  AI_DATA_EXPORTED: 'AI data exported (GDPR)',
  AI_DATA_DELETED: 'AI data deleted (GDPR)'
};
```

### Extension Module Security Checklist

#### Data Import
- [ ] OAuth tokens encrypted at rest
- [ ] Connection strings never logged
- [ ] Import data validated before storage
- [ ] Sync operations have timeout limits
- [ ] Failed syncs don't expose credentials

#### Visual Builders
- [ ] Flow definitions validated for cycles
- [ ] Node/edge counts limited
- [ ] User input sanitized in labels
- [ ] Webhook URLs validated
- [ ] Condition expressions use safe operators

#### Social Media
- [ ] OAuth tokens encrypted
- [ ] Token refresh automated
- [ ] Content limits enforced
- [ ] Media validated before upload
- [ ] Post content sanitized

#### AI Assistant
- [ ] API keys encrypted at rest
- [ ] Keys never exposed to frontend
- [ ] Token usage tracked per user
- [ ] Usage limits enforced
- [ ] AI data exportable (GDPR)
- [ ] AI data deletable (GDPR)
- [ ] Conversations isolated per user
- [ ] No cross-user data sharing

---

## Resources

### Security Contacts
- **Security Team**: security@gimbal.app
- **Incident Reporting**: incidents@gimbal.app
- **Data Protection Officer**: dpo@gimbal.app

### Documentation
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- GDPR Guidelines: https://gdpr.eu/
- SOC 2 Framework: https://www.aicpa.org/soc2
- Supabase Security: https://supabase.com/security

### Tools
- Sentry (error tracking)
- GitHub Advanced Security
- Dependabot (dependency updates)
- CodeQL (SAST)
- npm audit (vulnerability scanning)
