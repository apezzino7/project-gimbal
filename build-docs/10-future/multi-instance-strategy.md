# Multi-Instance Strategy (Future Feature)

> **Note**: This document describes future capabilities for potential white-label multi-tenant deployment. The current MVP uses single-tenant architecture. See [10-future/README.md](./README.md) for implementation timeline.

---

# Multi-Instance Strategy

## Overview

Project Gimbal uses a white-label, multi-instance deployment model where each customer receives a completely isolated instance of the platform. This approach ensures maximum data security, customization flexibility, and compliance with data sovereignty requirements.

## Instance Architecture

### What is an Instance?

An instance is a complete, isolated deployment of Project Gimbal consisting of:
- Dedicated Supabase project (database, auth, storage)
- Dedicated frontend deployment with custom subdomain
- Customer-specific configuration and branding
- Isolated data storage and user authentication
- Separate API endpoints and webhooks

### Instance Isolation Model

```
Customer A Instance                     Customer B Instance
─────────────────────                  ─────────────────────
customera.gimbal.app                   customerb.gimbal.app
        ↓                                      ↓
Supabase Project A                     Supabase Project B
  - Database A                           - Database B
  - Auth Realm A                         - Auth Realm A
  - Storage A                            - Storage B
        ↓                                      ↓
Twilio SubAccount A                    Twilio SubAccount B
SendGrid SubUser A                     SendGrid SubUser B
```

## Instance Provisioning Workflow

### 1. Customer Onboarding Process

```
New Customer Signup
        ↓
Sales/Admin Approval
        ↓
Instance Provisioning Request
        ↓
Automated Provisioning Pipeline
        ↓
Instance Configuration
        ↓
Customer Notification & Access
```

### 2. Automated Provisioning Steps

#### Step 1: Supabase Project Creation
```bash
# Via Supabase Management API
POST https://api.supabase.com/v1/projects
{
  "organization_id": "gimbal-org-id",
  "name": "customer-name-prod",
  "region": "us-east-1",
  "plan": "pro"
}
```

#### Step 2: Database Schema Migration
```bash
# Apply base schema to new instance
supabase db push --project-ref <new-project-ref>
```

#### Step 3: Subdomain Configuration
```bash
# DNS Configuration (e.g., Cloudflare API)
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
{
  "type": "CNAME",
  "name": "customername",
  "content": "gimbal-frontend.vercel.app",
  "proxied": true
}
```

#### Step 4: Frontend Deployment
```bash
# Vercel deployment with custom environment
vercel deploy --env VITE_SUPABASE_URL=<customer-supabase-url> \
              --env VITE_SUPABASE_ANON_KEY=<customer-anon-key> \
              --env VITE_INSTANCE_ID=<customer-id> \
              --alias customername.gimbal.app
```

#### Step 5: Third-Party Service Setup
```bash
# Create Twilio subaccount
POST https://api.twilio.com/2010-04-01/Accounts.json
{
  "FriendlyName": "Customer Name - Gimbal"
}

# Create SendGrid subuser
POST https://api.sendgrid.com/v3/subusers
{
  "username": "customername-gimbal",
  "email": "customername@gimbal-system.com"
}
```

#### Step 6: Instance Configuration
- Create admin user
- Set customer branding (logo, colors)
- Configure default settings
- Set up initial templates
- Configure webhooks

### 3. Provisioning Automation Script

```javascript
// scripts/provision-instance.js
async function provisionInstance(customerData) {
  try {
    // 1. Create Supabase project
    const supabaseProject = await createSupabaseProject({
      name: `${customerData.slug}-prod`,
      region: customerData.region || 'us-east-1'
    });

    // 2. Run database migrations
    await runDatabaseMigrations(supabaseProject.id);

    // 3. Configure DNS
    await configureDNS({
      subdomain: customerData.slug,
      target: 'gimbal-frontend.vercel.app'
    });

    // 4. Deploy frontend
    const deployment = await deployFrontend({
      subdomain: customerData.slug,
      supabaseUrl: supabaseProject.url,
      supabaseKey: supabaseProject.anonKey
    });

    // 5. Create external service accounts
    const twilioAccount = await createTwilioSubaccount(customerData);
    const sendgridUser = await createSendGridSubuser(customerData);

    // 6. Initialize instance configuration
    await initializeInstanceConfig({
      supabaseProject,
      customer: customerData,
      twilioAccount,
      sendgridUser
    });

    // 7. Create admin user
    await createAdminUser({
      email: customerData.adminEmail,
      projectId: supabaseProject.id
    });

    // 8. Log provisioning
    await logProvisioning({
      customerId: customerData.id,
      instanceId: supabaseProject.id,
      status: 'active',
      provisionedAt: new Date()
    });

    return {
      success: true,
      instanceUrl: `https://${customerData.slug}.gimbal.app`,
      adminEmail: customerData.adminEmail
    };
  } catch (error) {
    // Rollback on failure
    await rollbackProvisioning(customerData.id);
    throw error;
  }
}
```

## Instance Configuration Management

### Configuration Hierarchy

```
1. Global Defaults (shared across all instances)
   ↓
2. Customer-Level Configuration (per instance)
   ↓
3. User Preferences (per user within instance)
```

### Customer Admin Portal

The admin portal allows customers to configure their instance:

#### Branding Settings
- Logo upload (primary, favicon)
- Color scheme customization
- Custom CSS (advanced users)
- Email templates branding
- SMS sender name

#### Integration Settings
- SMS provider credentials (bring your own)
- Email provider credentials (bring your own)
- Webhook URLs for events
- API keys for third-party integrations

#### User Management
- Create/edit users
- Assign roles and permissions
- Set user quotas
- Manage teams/departments

#### Campaign Settings
- Default templates
- Compliance settings (opt-out language)
- Sending limits and throttling
- Timezone configuration

#### Data & Privacy
- Data retention policies
- Export/import data
- GDPR compliance settings
- Audit log retention

### Configuration Storage

```sql
-- Instance configuration table
CREATE TABLE instance_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID UNIQUE NOT NULL,

    -- Branding
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    custom_css TEXT,

    -- Integration credentials (encrypted)
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    sendgrid_api_key TEXT,

    -- Settings
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    locale VARCHAR(10) DEFAULT 'en-US',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',

    -- Limits
    monthly_sms_limit INTEGER DEFAULT 10000,
    monthly_email_limit INTEGER DEFAULT 50000,
    max_users INTEGER DEFAULT 50,

    -- Compliance
    data_retention_days INTEGER DEFAULT 730,
    enable_audit_log BOOLEAN DEFAULT TRUE,
    gdpr_enabled BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Instance Lifecycle Management

### Instance States

```
PROVISIONING → ACTIVE → SUSPENDED → TERMINATED
                  ↓
              MAINTENANCE
```

#### State Definitions
- **PROVISIONING**: Instance being created (5-10 minutes)
- **ACTIVE**: Instance operational and accessible
- **MAINTENANCE**: Temporary downtime for updates
- **SUSPENDED**: Customer payment issue or violation
- **TERMINATED**: Instance scheduled for deletion

### Instance Updates

#### Rolling Updates
```
1. Deploy new frontend version to staging
2. Run automated tests
3. Deploy to 10% of instances (canary)
4. Monitor for 24 hours
5. Gradual rollout to all instances
6. Rollback capability maintained
```

#### Database Migrations
```bash
# Zero-downtime migration strategy
1. Add new columns/tables (backward compatible)
2. Deploy application code that works with both versions
3. Migrate data in background
4. Switch application to use new schema
5. Remove old columns/tables after verification
```

### Instance Backup Strategy

#### Automated Backups
- **Frequency**: Daily at 2 AM instance timezone
- **Retention**: 30 days for daily, 90 days for weekly
- **Storage**: Supabase automatic backups
- **Testing**: Monthly backup restoration tests

#### Point-in-Time Recovery
- Available for last 7 days
- Supabase PITR feature
- Customer-initiated via support request

## Instance Security & Isolation

### Data Isolation
- Separate Supabase project per customer
- No shared database connections
- Isolated authentication realms
- Separate encryption keys

### Network Isolation
- Dedicated subdomains with SSL
- CORS policies per instance
- Rate limiting per instance
- DDoS protection via Cloudflare

### Access Control
- No cross-instance user access
- Admin panel requires separate auth
- Instance management API with strict permissions
- Audit logging for all administrative actions

## Instance Monitoring

### Health Checks

```javascript
// Health check endpoint per instance
GET https://customername.gimbal.app/api/health

Response:
{
  "status": "healthy",
  "instance_id": "uuid",
  "supabase": "connected",
  "database": "healthy",
  "auth": "operational",
  "version": "1.2.3",
  "uptime_seconds": 86400
}
```

### Monitoring Metrics per Instance
- Uptime percentage
- API response times
- Database query performance
- Error rates
- User activity metrics
- Storage usage
- SMS/Email quota usage

### Alerting
- Instance downtime > 5 minutes
- Error rate > 5%
- Database queries > 1 second
- Storage > 80% capacity
- Monthly quota > 90% used

## Instance Cost Management

### Cost Breakdown per Instance
```
Monthly Instance Cost:
- Supabase Pro: $25/month
- Vercel Hosting: $0-5/month (depending on traffic)
- Twilio (usage-based): Variable
- SendGrid (usage-based): Variable
- SSL Certificates: Included
- DNS: $0 (bulk pricing)

Total Base Cost: ~$30-40/month per instance
```

### Customer Billing Models
1. **Flat Rate**: Fixed monthly fee regardless of usage
2. **Usage-Based**: Base fee + overages for SMS/email
3. **Tiered**: Different tiers based on user count/features

## Instance Migration

### Data Export
- Full database dump (SQL)
- CSV export for all tables
- Media files archive
- Configuration export (JSON)

### Instance Cloning
- Clone for staging/testing purposes
- Clone for customer migration
- Anonymized data option for demos

## Scaling Strategy

### Vertical Scaling (Per Instance)
- Upgrade Supabase tier
- Increase database resources
- Enhance CDN caching

### Horizontal Scaling (Instance Count)
- Automated provisioning for new customers
- Instance management dashboard
- Resource pooling optimization

## Disaster Recovery

### Instance Failure Scenarios

#### Database Failure
1. Supabase automatic failover
2. PITR restoration if needed
3. Customer notification
4. RCA documentation

#### Frontend Deployment Failure
1. Automatic rollback to last known good
2. Vercel automatic retries
3. Monitoring alerts
4. Manual intervention if needed

### Recovery Time Objectives (RTO)
- **Critical Systems**: < 1 hour
- **Database Recovery**: < 4 hours
- **Full Instance Recovery**: < 24 hours

### Recovery Point Objectives (RPO)
- **Database**: < 5 minutes (via PITR)
- **File Storage**: < 24 hours (daily backups)
- **Configuration**: < 1 hour (versioned in Git)

## Instance Decommissioning

### Termination Process
```
1. Customer notification (30 days notice)
2. Data export provided
3. Instance marked as SUSPENDED
4. 30-day grace period for data retrieval
5. Instance marked as TERMINATED
6. Resources cleaned up
7. DNS records removed
8. Audit log archived
```

### Data Retention Post-Termination
- Audit logs: 7 years (compliance)
- Backup archives: 90 days
- Configuration history: 1 year

## Best Practices

### For Instance Provisioning
1. Use infrastructure as code (Terraform/Pulumi)
2. Automate everything possible
3. Implement idempotent provisioning scripts
4. Maintain detailed provisioning logs
5. Test provisioning in staging environment

### For Instance Management
1. Regular health checks and monitoring
2. Automated backups verification
3. Keep customer configurations in version control
4. Document all manual interventions
5. Maintain runbooks for common issues

### For Security
1. Rotate service credentials regularly
2. Implement least-privilege access
3. Enable MFA for admin access
4. Regular security audits
5. Penetration testing per instance type

## Future Enhancements

- Self-service instance provisioning portal
- Instance analytics dashboard
- Automated capacity planning
- Multi-region instance support
- Instance templates for vertical markets
- Customer-managed encryption keys
- Advanced monitoring and alerting
- Automated compliance reporting
