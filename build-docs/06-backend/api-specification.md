# API Specification

## Overview

Project Gimbal provides a RESTful API built on Supabase, offering auto-generated endpoints for database operations along with custom Edge Functions for complex business logic.

## Base URLs

```
Production:    https://<instance-id>.supabase.co
Custom Domain: https://api.<customer-subdomain>.gimbal.app
```

## Authentication

### How Authentication Works with Supabase Client

When using the Supabase JavaScript client, **authentication is automatic**. You don't manually manage tokens or headers.

```typescript
// After user logs in via supabase.auth.signInWithPassword()
// ALL subsequent Supabase client calls automatically include auth headers

// ✅ This request is automatically authenticated
const { data } = await supabase
  .from('campaigns')
  .select('*');

// Supabase client automatically adds:
// Authorization: Bearer <jwt_token>
// apikey: <anon_key>
```

### Authentication Methods

#### 1. Supabase Client (Recommended)
Use the Supabase JS client—it handles auth headers automatically.

```typescript
import { supabase } from './lib/supabase';

// User signs in
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Now all requests are authenticated
const { data } = await supabase.from('campaigns').select('*');
```

#### 2. Direct REST API (Advanced Use Only)
Only use direct REST calls if you're not using JavaScript/TypeScript or building a custom client.

```http
GET /rest/v1/campaigns
Authorization: Bearer <jwt_token>
apikey: <anon_key>
```

**Note**: When using the Supabase client, you never manually set `Authorization` headers or manage tokens.

### Login via Supabase Client (Not Direct API Calls)

**✅ DO THIS:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Supabase automatically:
// - Manages JWT and refresh tokens
// - Stores tokens securely
// - Refreshes tokens before expiry
// - Includes tokens in all API requests
```

**❌ DON'T manually call `/auth/v1/token`**
**❌ DON'T manually store or refresh tokens**

### Token Management

Supabase client handles token refresh **automatically**. You don't need to implement refresh logic.

```typescript
// This is handled internally by Supabase—you don't write this code
// Supabase checks token expiry on every request and refreshes if needed
```

## API Versioning

Current version: **v1**

Version is included in the URL path: `/rest/v1/` or `/functions/v1/`

Breaking changes will increment the version number. Deprecated versions will be supported for 12 months.

## Standard Response Format

### Success Response
```json
{
  "data": [...],
  "count": 10,
  "status": 200
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {},
    "status": 400
  }
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Successful deletion |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Temporary downtime |

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 50 requests | 1 minute |
| Campaign Sends | 10 requests | 1 minute |
| File Uploads | 20 requests | 1 minute |

### Rate Limit Error Response
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 60,
    "status": 429
  }
}
```

## Core API Endpoints

### Users

#### Get Current User
```http
GET /auth/v1/user
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  },
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Update User Profile
```http
PATCH /auth/v1/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "first_name": "Jane",
    "last_name": "Smith"
  }
}
```

#### List Users (Admin Only)
```http
GET /rest/v1/users?select=*&order=created_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Campaigns

#### List Campaigns
```http
GET /rest/v1/campaigns?select=*&order=created_at.desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `select`: Fields to return (default: `*`)
- `order`: Sort order (e.g., `created_at.desc`)
- `limit`: Number of results (default: 10, max: 100)
- `offset`: Pagination offset
- `status`: Filter by status (`draft`, `scheduled`, `sent`, `failed`)
- `type`: Filter by type (`sms`, `email`)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Summer Sale Campaign",
    "type": "sms",
    "status": "scheduled",
    "content": "Get 20% off all products!",
    "scheduled_date": "2024-07-01T10:00:00Z",
    "recipient_count": 1500,
    "created_at": "2024-06-25T14:30:00Z",
    "updated_at": "2024-06-25T14:30:00Z"
  }
]
```

#### Get Campaign by ID
```http
GET /rest/v1/campaigns?id=eq.<campaign_id>&select=*
Authorization: Bearer <token>
```

#### Create Campaign
```http
POST /rest/v1/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Holiday Campaign",
  "type": "email",
  "status": "draft",
  "content": "Happy holidays from our team!",
  "subject": "Holiday Greetings",
  "scheduled_date": "2024-12-24T09:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Holiday Campaign",
  "type": "email",
  "status": "draft",
  "created_at": "2024-12-01T10:00:00Z"
}
```

#### Update Campaign
```http
PATCH /rest/v1/campaigns?id=eq.<campaign_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "scheduled"
}
```

#### Delete Campaign
```http
DELETE /rest/v1/campaigns?id=eq.<campaign_id>
Authorization: Bearer <token>
```

#### Send Campaign (Edge Function)
```http
POST /functions/v1/send-campaign
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaign_id": "uuid",
  "send_immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "campaign_id": "uuid",
  "scheduled_for": "2024-12-24T09:00:00Z",
  "estimated_recipients": 1500
}
```

### Analytics

#### Get Dashboard Analytics
```http
GET /functions/v1/analytics/dashboard
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date`: ISO 8601 date (default: 30 days ago)
- `end_date`: ISO 8601 date (default: now)
- `metrics`: Comma-separated list (`sends,opens,clicks,conversions`)

**Response:**
```json
{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "metrics": {
    "total_campaigns": 45,
    "total_sends": 15000,
    "open_rate": 0.35,
    "click_rate": 0.12,
    "conversion_rate": 0.05
  },
  "trends": [
    {
      "date": "2024-01-01",
      "sends": 500,
      "opens": 175,
      "clicks": 60
    }
  ]
}
```

#### Get Campaign Analytics
```http
GET /functions/v1/analytics/campaign/<campaign_id>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "campaign_id": "uuid",
  "name": "Summer Sale Campaign",
  "type": "sms",
  "sent_at": "2024-07-01T10:00:00Z",
  "stats": {
    "total_sent": 1500,
    "delivered": 1485,
    "failed": 15,
    "clicked": 180,
    "converted": 75,
    "revenue": 7500.00
  },
  "hourly_breakdown": [...]
}
```

### Reports

#### List Reports
```http
GET /rest/v1/reports?select=*&order=generated_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "report_type": "campaign_performance",
    "campaign_id": "uuid",
    "generated_at": "2024-01-15T10:00:00Z",
    "file_url": "https://storage.supabase.co/...",
    "format": "pdf"
  }
]
```

#### Generate Report
```http
POST /functions/v1/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "report_type": "campaign_performance",
  "campaign_id": "uuid",
  "format": "pdf",
  "include_charts": true
}
```

**Response:**
```json
{
  "report_id": "uuid",
  "status": "generating",
  "estimated_completion": "2024-01-15T10:05:00Z"
}
```

#### Download Report
```http
GET /rest/v1/reports?id=eq.<report_id>&select=file_url
Authorization: Bearer <token>
```

### Templates

#### List Templates
```http
GET /rest/v1/templates?select=*&type=eq.sms
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Welcome Message",
    "type": "sms",
    "content": "Welcome {{first_name}}! Thanks for joining us.",
    "variables": ["first_name"],
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Template
```http
POST /rest/v1/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Promotion Template",
  "type": "email",
  "subject": "Special Offer for {{first_name}}",
  "content": "<html>...</html>",
  "variables": ["first_name", "discount_code"]
}
```

### Audiences

#### List Audiences
```http
GET /rest/v1/audiences?select=*
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Active Customers",
    "description": "Customers who purchased in last 90 days",
    "filters": {
      "last_purchase_days": 90,
      "status": "active"
    },
    "member_count": 1250,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Audience
```http
POST /rest/v1/audiences
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP Customers",
  "description": "Customers with lifetime value > $1000",
  "filters": {
    "lifetime_value_min": 1000
  }
}
```

---

## Extension Module APIs

### Data Import API (MVP)

#### List Data Sources
```http
GET /rest/v1/data_sources?select=*&order=created_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "My GA4 Property",
    "type": "google_analytics",
    "sync_schedule": "daily",
    "last_sync_at": "2024-01-15T02:00:00Z",
    "sync_status": "success",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Data Source
```http
POST /rest/v1/data_sources
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Analytics",
  "type": "google_analytics",
  "config": {
    "property_id": "123456789"
  },
  "sync_schedule": "daily"
}
```

#### Update Data Source
```http
PATCH /rest/v1/data_sources?id=eq.<source_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "sync_schedule": "hourly",
  "is_active": true
}
```

#### Delete Data Source
```http
DELETE /rest/v1/data_sources?id=eq.<source_id>
Authorization: Bearer <token>
```

#### Trigger Manual Sync (Edge Function)
```http
POST /functions/v1/sync-data-source
Authorization: Bearer <token>
Content-Type: application/json

{
  "data_source_id": "uuid"
}
```

**Response:**
```json
{
  "sync_log_id": "uuid",
  "status": "running",
  "started_at": "2024-01-15T10:00:00Z"
}
```

#### Get Sync Logs
```http
GET /rest/v1/sync_logs?data_source_id=eq.<source_id>&order=started_at.desc&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "data_source_id": "uuid",
    "started_at": "2024-01-15T02:00:00Z",
    "completed_at": "2024-01-15T02:05:32Z",
    "status": "success",
    "records_imported": 15420
  }
]
```

#### Get Imported Data
```http
GET /rest/v1/imported_data?data_source_id=eq.<source_id>&event_date=gte.2024-01-01
Authorization: Bearer <token>
```

#### OAuth Callback (Edge Function)
```http
GET /functions/v1/oauth/google/callback?code=<auth_code>&state=<state>
```

### Visual Builder API (Phase A - Future)

#### Campaign Flows

##### List Campaign Flows
```http
GET /rest/v1/campaign_flows?select=*&order=updated_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Welcome Series",
    "description": "3-email welcome sequence",
    "trigger_type": "segment_entry",
    "is_active": true,
    "last_run_at": "2024-01-15T08:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

##### Get Flow with Nodes/Edges
```http
GET /rest/v1/campaign_flows?id=eq.<flow_id>&select=*
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Welcome Series",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": {"x": 100, "y": 100},
      "data": {"nodeType": "segment_entry", "config": {"segment_id": "uuid"}}
    },
    {
      "id": "action-1",
      "type": "action",
      "position": {"x": 100, "y": 250},
      "data": {"nodeType": "send_email", "config": {"template_id": "uuid"}}
    }
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "action-1"}
  ]
}
```

##### Create Campaign Flow
```http
POST /rest/v1/campaign_flows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Re-engagement Flow",
  "description": "Win back inactive users",
  "trigger_type": "scheduled",
  "trigger_config": {"schedule": "0 9 * * MON"},
  "nodes": [...],
  "edges": [...]
}
```

##### Update Campaign Flow
```http
PATCH /rest/v1/campaign_flows?id=eq.<flow_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodes": [...],
  "edges": [...],
  "is_active": true
}
```

##### Validate Flow (Edge Function)
```http
POST /functions/v1/validate-flow
Authorization: Bearer <token>
Content-Type: application/json

{
  "flow_id": "uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["A/B split percentages don't sum to 100%"]
}
```

##### Execute Flow (Edge Function)
```http
POST /functions/v1/execute-flow
Authorization: Bearer <token>
Content-Type: application/json

{
  "flow_id": "uuid",
  "contact_ids": ["uuid1", "uuid2"]
}
```

#### Audience Segments

##### List Segments
```http
GET /rest/v1/audience_segments?select=*&order=created_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Active Subscribers",
    "description": "Opened email in last 30 days",
    "estimated_size": 2450,
    "is_dynamic": true,
    "last_calculated_at": "2024-01-15T06:00:00Z"
  }
]
```

##### Create Segment
```http
POST /rest/v1/audience_segments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP Customers",
  "description": "High-value customers",
  "rules": [
    {
      "type": "group",
      "logic": "AND",
      "rules": [
        {"type": "condition", "field": "total_purchases", "operator": "greater_than", "value": 1000},
        {"type": "condition", "field": "email_subscribed", "operator": "equals", "value": true}
      ]
    }
  ],
  "is_dynamic": true
}
```

##### Calculate Segment Size (Edge Function)
```http
POST /functions/v1/calculate-segment
Authorization: Bearer <token>
Content-Type: application/json

{
  "segment_id": "uuid"
}
```

**Response:**
```json
{
  "segment_id": "uuid",
  "estimated_size": 2450,
  "calculated_at": "2024-01-15T10:00:00Z"
}
```

#### Custom Dashboards

##### List Dashboards
```http
GET /rest/v1/custom_dashboards?select=*&order=created_at.desc
Authorization: Bearer <token>
```

##### Create Dashboard
```http
POST /rest/v1/custom_dashboards
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Marketing Overview",
  "description": "Key marketing metrics",
  "layout": [
    {
      "id": "widget-1",
      "type": "metric",
      "title": "Total Sends",
      "dataSource": {"table": "campaigns", "metrics": ["count"]},
      "layout": {"x": 0, "y": 0, "w": 3, "h": 2}
    }
  ]
}
```

##### Update Dashboard
```http
PATCH /rest/v1/custom_dashboards?id=eq.<dashboard_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "layout": [...],
  "is_shared": true,
  "shared_with": ["uuid1", "uuid2"]
}
```

### Social Media API (Phase B - Future)

#### Social Accounts

##### List Social Accounts
```http
GET /rest/v1/social_accounts?select=id,platform,account_name,is_active,last_used_at
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "platform": "facebook",
    "account_name": "Acme Corp Page",
    "is_active": true,
    "last_used_at": "2024-01-14T15:30:00Z"
  }
]
```

##### Connect Social Account (Edge Function)
```http
POST /functions/v1/social/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "facebook",
  "redirect_uri": "https://app.gimbal.app/social/callback"
}
```

**Response:**
```json
{
  "auth_url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "state": "random_state_token"
}
```

##### OAuth Callback (Edge Function)
```http
GET /functions/v1/social/callback?platform=facebook&code=<auth_code>&state=<state>
```

##### Disconnect Social Account
```http
DELETE /rest/v1/social_accounts?id=eq.<account_id>
Authorization: Bearer <token>
```

#### Social Posts

##### List Social Posts
```http
GET /rest/v1/social_posts?select=*,social_accounts(platform,account_name)&order=created_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "content": "Excited to announce our new product!",
    "media_urls": ["https://storage.supabase.co/..."],
    "status": "published",
    "scheduled_at": null,
    "published_at": "2024-01-15T14:00:00Z",
    "social_accounts": {
      "platform": "instagram",
      "account_name": "@acmecorp"
    }
  }
]
```

##### Create Social Post
```http
POST /rest/v1/social_posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "social_account_id": "uuid",
  "content": "Check out our latest blog post!",
  "link_url": "https://example.com/blog",
  "hashtags": ["#marketing", "#tips"],
  "status": "draft"
}
```

##### Schedule Post
```http
PATCH /rest/v1/social_posts?id=eq.<post_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "scheduled",
  "scheduled_at": "2024-01-20T14:00:00Z"
}
```

##### Publish Post Immediately (Edge Function)
```http
POST /functions/v1/social/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "post_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "platform_post_id": "123456789",
  "published_at": "2024-01-15T14:00:00Z"
}
```

##### Multi-Platform Post (Edge Function)
```http
POST /functions/v1/social/publish-multi
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Big announcement coming soon!",
  "media_urls": ["https://..."],
  "account_ids": ["uuid1", "uuid2", "uuid3"],
  "scheduled_at": "2024-01-20T14:00:00Z"
}
```

**Response:**
```json
{
  "posts_created": [
    {"post_id": "uuid1", "platform": "facebook", "status": "scheduled"},
    {"post_id": "uuid2", "platform": "instagram", "status": "scheduled"},
    {"post_id": "uuid3", "platform": "linkedin", "status": "scheduled"}
  ]
}
```

#### Social Engagement

##### Get Post Engagement
```http
GET /rest/v1/social_engagement?post_id=eq.<post_id>&order=fetched_at.desc&limit=1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "post_id": "uuid",
  "likes": 245,
  "comments": 32,
  "shares": 18,
  "clicks": 156,
  "impressions": 5420,
  "reach": 4200,
  "engagement_rate": 0.0702,
  "fetched_at": "2024-01-15T16:00:00Z"
}
```

##### Refresh Engagement (Edge Function)
```http
POST /functions/v1/social/refresh-engagement
Authorization: Bearer <token>
Content-Type: application/json

{
  "post_id": "uuid"
}
```

### AI Assistant API (Phase C - Future)

#### AI Providers

##### List AI Providers
```http
GET /rest/v1/ai_providers?select=id,name,provider_type,model_name,is_default,is_active
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "My OpenAI",
    "provider_type": "openai",
    "model_name": "gpt-4-turbo",
    "is_default": true,
    "is_active": true
  }
]
```

##### Add AI Provider
```http
POST /rest/v1/ai_providers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Claude",
  "provider_type": "anthropic",
  "api_key": "sk-ant-...",
  "model_name": "claude-3-sonnet-20240229",
  "config": {
    "temperature": 0.7,
    "max_tokens": 2000
  },
  "is_default": false
}
```

##### Validate API Key (Edge Function)
```http
POST /functions/v1/ai/validate-key
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_type": "openai",
  "api_key": "sk-..."
}
```

**Response:**
```json
{
  "valid": true,
  "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
}
```

##### Update AI Provider
```http
PATCH /rest/v1/ai_providers?id=eq.<provider_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "model_name": "gpt-4",
  "is_default": true
}
```

##### Delete AI Provider
```http
DELETE /rest/v1/ai_providers?id=eq.<provider_id>
Authorization: Bearer <token>
```

#### AI Conversations

##### List Conversations
```http
GET /rest/v1/ai_conversations?select=*&is_archived=eq.false&order=updated_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Campaign Strategy Discussion",
    "context_type": "campaign",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T11:30:00Z"
  }
]
```

##### Create Conversation
```http
POST /rest/v1/ai_conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "ai_provider_id": "uuid",
  "title": "Analytics Review",
  "context_type": "analytics",
  "context_data": {
    "date_range": "last_30_days",
    "metrics": ["open_rate", "click_rate", "conversion_rate"]
  }
}
```

##### Get Conversation with Messages
```http
GET /rest/v1/ai_conversations?id=eq.<conversation_id>&select=*,ai_messages(*)
Authorization: Bearer <token>
```

##### Archive Conversation
```http
PATCH /rest/v1/ai_conversations?id=eq.<conversation_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_archived": true
}
```

#### AI Chat

##### Send Message (Edge Function)
```http
POST /functions/v1/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "message": "What subject lines would work best for our holiday campaign?"
}
```

**Response:**
```json
{
  "message_id": "uuid",
  "role": "assistant",
  "content": "Based on your audience engagement data, here are some subject line suggestions...",
  "tokens_input": 450,
  "tokens_output": 320,
  "model_used": "gpt-4-turbo",
  "latency_ms": 2340,
  "suggestions": [
    {
      "id": "uuid",
      "type": "subject_line",
      "title": "Holiday Subject Lines",
      "content": {
        "options": [
          "🎄 Your Holiday Gift Awaits Inside",
          "Last Chance: Holiday Deals End Tonight",
          "Unwrap 25% Off This Holiday Season"
        ]
      },
      "reasoning": "Short, urgency-driven subject lines with emojis have shown 23% higher open rates..."
    }
  ]
}
```

#### AI Suggestions

##### List Suggestions
```http
GET /rest/v1/ai_suggestions?select=*&status=eq.pending&order=created_at.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "conversation_id": "uuid",
    "suggestion_type": "email_content",
    "title": "Holiday Email Draft",
    "content": {
      "subject": "Your Holiday Gift Awaits",
      "body": "Dear {{first_name}},..."
    },
    "reasoning": "Based on your brand voice and past performance...",
    "confidence": 0.85,
    "status": "pending"
  }
]
```

##### Apply Suggestion (Edge Function)
```http
POST /functions/v1/ai/apply-suggestion
Authorization: Bearer <token>
Content-Type: application/json

{
  "suggestion_id": "uuid",
  "target_type": "template",
  "target_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "applied_to": {
    "type": "template",
    "id": "uuid",
    "name": "Holiday Email Template"
  }
}
```

##### Update Suggestion Status
```http
PATCH /rest/v1/ai_suggestions?id=eq.<suggestion_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "rejected"
}
```

#### AI Token Usage

##### Get Token Usage (Current User)
```http
GET /rest/v1/ai_token_usage?date=gte.2024-01-01&order=date.desc
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "input_tokens": 4520,
    "output_tokens": 3200,
    "request_count": 12,
    "estimated_cost": 0.23
  }
]
```

##### Get Usage Summary (Edge Function)
```http
GET /functions/v1/ai/usage-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "daily": {
    "used": 7720,
    "limit": 10000,
    "remaining": 2280
  },
  "monthly": {
    "used": 45600,
    "limit": 100000,
    "remaining": 54400
  },
  "estimated_cost_this_month": 12.45
}
```

##### Check Limits (Edge Function)
```http
GET /functions/v1/ai/check-limits
Authorization: Bearer <token>
```

**Response:**
```json
{
  "can_use": true,
  "daily_remaining": 2280,
  "monthly_remaining": 54400,
  "message": "OK"
}
```

#### AI GDPR Operations

##### Export AI Data (Edge Function)
```http
POST /functions/v1/ai/export-data
Authorization: Bearer <token>
```

**Response:**
```json
{
  "export_id": "uuid",
  "status": "generating",
  "estimated_completion": "2024-01-15T10:05:00Z"
}
```

##### Delete AI Data (Edge Function)
```http
DELETE /functions/v1/ai/delete-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirm": true
}
```

**Response:**
```json
{
  "success": true,
  "deleted": {
    "conversations": 15,
    "messages": 234,
    "suggestions": 45,
    "providers": 2,
    "token_usage_records": 30
  }
}
```

---

## Webhooks

### Webhook Events

Project Gimbal can send webhooks for the following events:

#### Core Events
| Event | Description |
|-------|-------------|
| `campaign.sent` | Campaign successfully sent |
| `campaign.failed` | Campaign failed to send |
| `message.delivered` | Individual message delivered |
| `message.failed` | Individual message failed |
| `message.clicked` | Link in message clicked |
| `user.created` | New user created |
| `user.deleted` | User deleted |
| `report.generated` | Report generation completed |

#### Data Import Events (MVP)
| Event | Description |
|-------|-------------|
| `sync.started` | Data sync started |
| `sync.completed` | Data sync completed successfully |
| `sync.failed` | Data sync failed |

#### Visual Builder Events (Phase A - Future)
| Event | Description |
|-------|-------------|
| `flow.activated` | Campaign flow activated |
| `flow.deactivated` | Campaign flow deactivated |
| `flow.execution.completed` | Flow execution completed for contact |
| `flow.execution.failed` | Flow execution failed |
| `segment.updated` | Segment membership recalculated |

#### Social Media Events (Phase B - Future)
| Event | Description |
|-------|-------------|
| `social.published` | Social post published |
| `social.failed` | Social post failed to publish |
| `social.engagement.updated` | Engagement metrics updated |
| `social.account.disconnected` | Social account token expired/revoked |

#### AI Assistant Events (Phase C - Future)
| Event | Description |
|-------|-------------|
| `ai.suggestion.created` | New AI suggestion generated |
| `ai.suggestion.applied` | AI suggestion applied to module |
| `ai.limit.approaching` | Token usage approaching limit (80%) |
| `ai.limit.exceeded` | Token usage limit exceeded |

### Webhook Configuration

#### Register Webhook
```http
POST /rest/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["campaign.sent", "message.delivered"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload

```json
{
  "id": "webhook_event_uuid",
  "event": "campaign.sent",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "campaign_id": "uuid",
    "name": "Summer Sale",
    "sent_count": 1500
  },
  "signature": "sha256_hmac_signature"
}
```

### Webhook Signature Verification

```javascript
import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}
```

## File Upload API

### Upload File
```http
POST /storage/v1/object/<bucket_name>/<file_path>
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary_data>
```

**Response:**
```json
{
  "Key": "public/logo.png",
  "Id": "uuid"
}
```

### Get File URL
```http
GET /storage/v1/object/public/<bucket_name>/<file_path>
```

### Delete File
```http
DELETE /storage/v1/object/<bucket_name>/<file_path>
Authorization: Bearer <token>
```

## Pagination

### Offset-Based Pagination
```http
GET /rest/v1/campaigns?limit=20&offset=40
```

### Range-Based Pagination
```http
GET /rest/v1/campaigns
Range: 0-19
```

**Response Headers:**
```http
Content-Range: 0-19/156
```

## Filtering

### Equality
```http
GET /rest/v1/campaigns?status=eq.active
```

### Comparison Operators
```http
GET /rest/v1/campaigns?created_at=gte.2024-01-01
GET /rest/v1/campaigns?recipient_count=lt.1000
```

Available operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`

### Pattern Matching
```http
GET /rest/v1/campaigns?name=like.*Sale*
GET /rest/v1/campaigns?name=ilike.*summer*
```

### Multiple Filters
```http
GET /rest/v1/campaigns?status=eq.sent&type=eq.sms&created_at=gte.2024-01-01
```

## Sorting

```http
GET /rest/v1/campaigns?order=created_at.desc
GET /rest/v1/campaigns?order=name.asc,created_at.desc
```

## Field Selection

### Select Specific Fields
```http
GET /rest/v1/campaigns?select=id,name,status
```

### Nested Resources
```http
GET /rest/v1/campaigns?select=*,user:users(email,first_name)
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `CAMPAIGN_SEND_FAILED` | Campaign failed to send |
| `INSUFFICIENT_CREDITS` | Not enough SMS/email credits |
| `INVALID_TEMPLATE` | Template validation failed |
| `AUDIENCE_EMPTY` | No recipients in audience |

## Edge Functions

### Custom Business Logic Endpoints

#### Validate Campaign
```http
POST /functions/v1/validate-campaign
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaign_id": "uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Audience size is large, sending may take time"]
}
```

#### Bulk Import Contacts
```http
POST /functions/v1/contacts/bulk-import
Authorization: Bearer <token>
Content-Type: application/json

{
  "contacts": [
    {"email": "user1@example.com", "phone": "+1234567890"},
    {"email": "user2@example.com", "phone": "+0987654321"}
  ],
  "audience_id": "uuid"
}
```

**Response:**
```json
{
  "imported": 2,
  "failed": 0,
  "duplicates": 0
}
```

## Real-time Subscriptions

### Subscribe to Campaign Updates

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

// Subscribe to campaign changes
const subscription = supabase
  .channel('campaigns')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'campaigns'
  }, (payload) => {
    console.log('Campaign change:', payload);
  })
  .subscribe();
```

### Presence Tracking

```javascript
const presence = supabase.channel('online-users')
  .on('presence', { event: 'sync' }, () => {
    const state = presence.presenceState();
    console.log('Online users:', state);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presence.track({ user_id: currentUser.id });
    }
  });
```

## SDK Usage Examples

### JavaScript/TypeScript
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://<instance>.supabase.co',
  '<anon_key>'
);

// Create campaign
const { data, error } = await supabase
  .from('campaigns')
  .insert({
    name: 'New Campaign',
    type: 'sms',
    content: 'Hello!'
  })
  .select();

// Get campaigns
const { data: campaigns } = await supabase
  .from('campaigns')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

### Python
```python
from supabase import create_client, Client

supabase: Client = create_client(
    "https://<instance>.supabase.co",
    "<anon_key>"
)

# Create campaign
response = supabase.table('campaigns').insert({
    "name": "New Campaign",
    "type": "sms",
    "content": "Hello!"
}).execute()

# Get campaigns
campaigns = supabase.table('campaigns')\
    .select("*")\
    .eq('status', 'active')\
    .order('created_at', desc=True)\
    .execute()
```

## Testing

### Test Credentials

Sandbox environment: `https://<instance>-staging.supabase.co`

```
Test User:
  email: test@example.com
  password: Test123!@#
```

### Test Data

Use the `x-test-mode: true` header to prevent actual SMS/email sends:

```http
POST /functions/v1/send-campaign
Authorization: Bearer <token>
X-Test-Mode: true
Content-Type: application/json

{
  "campaign_id": "uuid"
}
```

## Best Practices

### 1. Use Pagination
Always use pagination for large datasets to avoid performance issues.

### 2. Cache Responses
Implement client-side caching for frequently accessed data.

### 3. Handle Rate Limits
Implement exponential backoff when rate limits are hit.

### 4. Validate Input
Always validate input on the client side before API calls.

### 5. Use Webhooks
Use webhooks for event-driven workflows instead of polling.

### 6. Batch Operations
Use bulk endpoints for multiple operations when available.

### 7. Error Handling
Always handle errors gracefully and log for debugging.

## Support

### API Documentation
- Interactive API docs: `https://api.gimbal.app/docs`
- Supabase API reference: https://supabase.com/docs/reference

### Support Channels
- Email: api-support@gimbal.app
- Developer Portal: https://developers.gimbal.app
- Status Page: https://status.gimbal.app

## Changelog

### v1.3.0 (Planned - Phase C)
- AI Assistant API
- AI provider management (BYOK)
- AI chat and suggestions
- Token usage tracking
- GDPR AI data operations

### v1.2.0 (Planned - Phase B)
- Social Media API
- Multi-platform posting
- Engagement tracking
- Social OAuth flows

### v1.1.0 (Planned - Phase A)
- Visual Builder API
- Campaign flows
- Audience segments
- Custom dashboards

### v1.0.0 (MVP)
- Data Import API
- Data source management
- Sync operations
- Campaign API
- Messaging API (SMS/Email)

### v1.0.0 (2024-01-01)
- Initial API release
- Core campaign management endpoints
- Analytics endpoints
- Webhook support
