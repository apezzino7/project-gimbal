# Deployment Guide

## Overview

This guide covers the deployment process for Project Gimbal instances, including initial setup, environment configuration, and ongoing deployment procedures.

## Prerequisites

### Required Accounts
- [ ] GitHub account (with repository access)
- [ ] Supabase account (Pro tier recommended)
- [ ] Vercel or Netlify account
- [ ] Cloudflare account (for DNS management)
- [ ] Twilio account (for SMS functionality)
- [ ] SendGrid account (for email functionality)
- [ ] Sentry account (for error tracking)

### Required Tools
```bash
# Node.js 18+
node --version  # v18.0.0 or higher

# npm or yarn
npm --version   # 8.0.0 or higher

# Supabase CLI
npm install -g supabase

# Vercel CLI (if using Vercel)
npm install -g vercel

# Git
git --version
```

## Deployment Architecture

```
Developer → GitHub → CI/CD (GitHub Actions) → Staging → Production
                           ↓
                    Automated Tests
                           ↓
                    Build Process
                           ↓
                    Deploy to Vercel
                           ↓
                    Configure Supabase
                           ↓
                    Setup DNS/SSL
```

## Environment Setup

### Environment Variables

Create environment files for each environment:

#### `.env.development`
```bash
# Supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Instance Config
VITE_INSTANCE_ID=dev-instance
VITE_INSTANCE_NAME="Development Instance"
VITE_API_BASE_URL=http://localhost:5173

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SMS=false
VITE_ENABLE_EMAIL=false

# External Services (Test/Sandbox)
VITE_TWILIO_ACCOUNT_SID=test_account
VITE_SENDGRID_API_KEY=test_key

# Error Tracking
VITE_SENTRY_DSN=<sentry-dsn>
VITE_SENTRY_ENVIRONMENT=development
```

#### `.env.staging`
```bash
# Supabase (Staging Project)
VITE_SUPABASE_URL=https://<staging-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>

# Instance Config
VITE_INSTANCE_ID=staging-instance
VITE_INSTANCE_NAME="Staging Instance"
VITE_API_BASE_URL=https://staging.gimbal.app

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SMS=true
VITE_ENABLE_EMAIL=true

# External Services (Test/Sandbox)
VITE_TWILIO_ACCOUNT_SID=<staging-account>
VITE_SENDGRID_API_KEY=<staging-key>

# Error Tracking
VITE_SENTRY_DSN=<sentry-dsn>
VITE_SENTRY_ENVIRONMENT=staging
```

#### `.env.production`
```bash
# Supabase (Production Project)
VITE_SUPABASE_URL=https://<prod-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>

# Instance Config
VITE_INSTANCE_ID=<customer-id>
VITE_INSTANCE_NAME="<Customer Name>"
VITE_API_BASE_URL=https://<customer-subdomain>.gimbal.app

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SMS=true
VITE_ENABLE_EMAIL=true

# External Services (Production)
VITE_TWILIO_ACCOUNT_SID=<prod-account>
VITE_SENDGRID_API_KEY=<prod-key>

# Error Tracking
VITE_SENTRY_DSN=<sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
```

**IMPORTANT**: Never commit `.env` files to version control. Use `.env.example` as a template.

## Supabase Setup

### 1. Create Supabase Project

```bash
# Via Supabase Dashboard
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in details:
   - Organization: Your organization
   - Name: customer-name-prod
   - Database Password: Generate strong password
   - Region: us-east-1 (or customer preference)
   - Pricing Plan: Pro

# Or via API
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "<org-id>",
    "name": "customer-prod",
    "region": "us-east-1",
    "plan": "pro"
  }'
```

### 2. Database Setup

```bash
# Initialize Supabase in project
supabase init

# Link to remote project
supabase link --project-ref <project-ref>

# Run migrations
supabase db push

# Or apply migrations manually
psql -h <db-host> -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
```

### 3. Configure Authentication

```bash
# Via Supabase Dashboard
Settings > Authentication > Configure:

1. Email Auth
   - Enable email confirmation: Yes
   - Secure email change: Yes
   - Email template customization

2. Password Policy
   - Minimum password length: 12
   - Require special characters: Yes

3. Session Settings
   - JWT expiry: 3600 (1 hour)
   - Refresh token rotation: Enabled
   - Reuse interval: 10 seconds

4. Site URL
   - https://customer.gimbal.app

5. Redirect URLs
   - https://customer.gimbal.app/**
```

### 4. Row-Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Apply policies (from database-implementation.md)
```

### 5. Storage Buckets

```bash
# Create storage buckets
supabase storage create avatars --public
supabase storage create reports --private
supabase storage create exports --private
supabase storage create templates --public

# Or via SQL
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('reports', 'reports', false),
  ('exports', 'exports', false),
  ('templates', 'templates', true);
```

### 6. Edge Functions

```bash
# Deploy edge functions
supabase functions deploy send-campaign
supabase functions deploy generate-report
supabase functions deploy analytics-dashboard

# Set environment secrets
supabase secrets set TWILIO_ACCOUNT_SID=<value>
supabase secrets set TWILIO_AUTH_TOKEN=<value>
supabase secrets set SENDGRID_API_KEY=<value>
```

## Frontend Deployment

### Vercel Deployment

#### 1. Initial Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### 2. Configure Project

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

#### 3. Set Environment Variables

```bash
# Via Vercel CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_INSTANCE_ID production
vercel env add VITE_SENTRY_DSN production

# Or via Vercel Dashboard
1. Go to Project Settings > Environment Variables
2. Add variables for Production, Preview, Development
```

#### 4. Deploy

```bash
# Deploy to production
vercel --prod

# Deploy to staging
vercel

# Deploy specific branch
vercel --prod --branch staging
```

### Netlify Deployment (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Strict-Transport-Security = "max-age=63072000"
```

## DNS Configuration

### Cloudflare Setup

#### 1. Add Domain/Subdomain

```bash
# Via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records" \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "customer",
    "content": "gimbal-prod.vercel.app",
    "ttl": 1,
    "proxied": true
  }'
```

#### 2. Configure SSL

```
1. SSL/TLS > Overview > Full (strict)
2. SSL/TLS > Edge Certificates > Always Use HTTPS: On
3. SSL/TLS > Edge Certificates > Minimum TLS Version: 1.2
4. SSL/TLS > Edge Certificates > Automatic HTTPS Rewrites: On
```

#### 3. Security Settings

```
1. Security > WAF > Enable WAF
2. Security > DDoS > Enable DDoS protection
3. Security > Bots > Enable Bot Fight Mode
4. Firewall > Create rate limiting rules
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  notify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Send deployment notification
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Deployment successful to production"}'
```

### Staging Deployment Workflow

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  pull_request:
    branches: [main]

jobs:
  # Similar to production but deploy to staging environment
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      # ... similar steps with staging environment variables
```

## Instance Provisioning Script

Automate new instance deployment:

```bash
#!/bin/bash
# scripts/provision-instance.sh

set -e

CUSTOMER_NAME=$1
CUSTOMER_SUBDOMAIN=$2
ADMIN_EMAIL=$3

echo "Provisioning instance for $CUSTOMER_NAME..."

# 1. Create Supabase project
echo "Creating Supabase project..."
PROJECT_ID=$(curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": \"$SUPABASE_ORG_ID\",
    \"name\": \"$CUSTOMER_SUBDOMAIN-prod\",
    \"region\": \"us-east-1\",
    \"plan\": \"pro\"
  }" | jq -r '.id')

echo "Supabase project created: $PROJECT_ID"

# 2. Run database migrations
echo "Running database migrations..."
supabase link --project-ref $PROJECT_ID
supabase db push

# 3. Configure DNS
echo "Configuring DNS..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"CNAME\",
    \"name\": \"$CUSTOMER_SUBDOMAIN\",
    \"content\": \"gimbal-prod.vercel.app\",
    \"ttl\": 1,
    \"proxied\": true
  }"

# 4. Deploy to Vercel
echo "Deploying to Vercel..."
vercel deploy --prod \
  --env VITE_INSTANCE_ID=$CUSTOMER_SUBDOMAIN \
  --env VITE_INSTANCE_NAME="$CUSTOMER_NAME" \
  --alias $CUSTOMER_SUBDOMAIN.gimbal.app

# 5. Create admin user
echo "Creating admin user..."
# Use Supabase Admin API to create user

echo "✅ Instance provisioned successfully!"
echo "URL: https://$CUSTOMER_SUBDOMAIN.gimbal.app"
echo "Admin: $ADMIN_EMAIL"
```

## Post-Deployment Checklist

### Immediate Post-Deployment (Within 1 hour)

- [ ] Verify application loads at custom domain
- [ ] Test user login/logout
- [ ] Verify database connection
- [ ] Check error tracking (Sentry)
- [ ] Test critical user flows
- [ ] Verify SSL certificate
- [ ] Check security headers
- [ ] Monitor error rates

### First 24 Hours

- [ ] Review application logs
- [ ] Monitor performance metrics
- [ ] Check backup completion
- [ ] Verify scheduled jobs
- [ ] Test webhook endpoints
- [ ] Review access logs
- [ ] Customer acceptance testing

### First Week

- [ ] Performance optimization if needed
- [ ] Review user feedback
- [ ] Monitor resource usage
- [ ] Verify compliance controls
- [ ] Update documentation
- [ ] Knowledge transfer to customer

## Rollback Procedures

### Frontend Rollback

```bash
# Vercel rollback to previous deployment
vercel rollback <deployment-url>

# Or redeploy specific commit
vercel --prod --force
```

### Database Rollback

```bash
# Point-in-time recovery (if within 7 days)
supabase db restore --project-ref <project-ref> --timestamp "2024-01-15 10:00:00"

# Or manual restore from backup
pg_restore -h <db-host> -U postgres -d postgres backup.sql
```

### Edge Function Rollback

```bash
# Redeploy previous version
supabase functions deploy send-campaign --version <previous-version>
```

## Monitoring & Health Checks

### Health Check Endpoint

```javascript
// src/api/health.ts
export async function healthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      auth: await checkAuth(),
      storage: await checkStorage()
    }
  };
}
```

### Uptime Monitoring

Configure external monitoring:

1. **UptimeRobot** - Free tier available
   - Monitor: https://customer.gimbal.app/api/health
   - Interval: 5 minutes
   - Alert: Email + Slack

2. **Pingdom** - More advanced
   - Transaction monitoring
   - Real user monitoring
   - Performance insights

## Disaster Recovery

### Backup Strategy

```bash
# Automated daily backups via Supabase
# Manual backup
supabase db dump --project-ref <project-ref> > backup-$(date +%Y%m%d).sql

# Backup to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://gimbal-backups/
```

### Recovery Time Objective (RTO)

- Critical systems: < 1 hour
- Full recovery: < 4 hours

### Recovery Point Objective (RPO)

- Database: < 5 minutes (Supabase PITR)
- Files: < 24 hours (daily backups)

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

#### Environment Variable Issues
```bash
# Verify variables are set
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

#### Database Connection Issues
```bash
# Test database connection
psql -h <db-host> -U postgres -d postgres

# Check connection pooling
# Verify max connections not exceeded
```

## Security Hardening

### Post-Deployment Security

1. **Change default credentials**
2. **Enable MFA for admin accounts**
3. **Review RLS policies**
4. **Configure WAF rules**
5. **Set up security monitoring**
6. **Enable audit logging**
7. **Review CORS policies**
8. **Test backup restoration**

## Documentation

### Instance Documentation

Create per-instance documentation:

```markdown
# Instance: <Customer Name>

## Details
- Instance ID: <uuid>
- Subdomain: customer.gimbal.app
- Supabase Project: <project-ref>
- Region: us-east-1
- Deployed: 2024-01-15

## Configuration
- Admin Email: admin@customer.com
- Timezone: America/New_York
- SMS Quota: 10,000/month
- Email Quota: 50,000/month

## Contacts
- Primary: John Doe (john@customer.com)
- Technical: Jane Smith (jane@customer.com)

## Notes
- Custom branding applied
- Integrated with customer CRM
```

## Future Improvements

- [ ] Automated zero-downtime deployments
- [ ] Blue-green deployment strategy
- [ ] Canary releases
- [ ] Infrastructure as Code (Terraform/Pulumi)
- [ ] Multi-region deployment
- [ ] Automated performance testing
- [ ] Self-service provisioning portal
