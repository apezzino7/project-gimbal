# Database Implementation

## Overview
This dashboard will use Supabase with PostgreSQL as the backend database. Supabase provides a comprehensive backend-as-a-service that includes database, authentication, storage, and real-time capabilities.

**MVP Scope**: Single Supabase instance with user-based data isolation via RLS. Multi-instance white-label architecture is deferred to Phase D (Future).

## Supabase JavaScript Library

### Client Initialization
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Authentication Methods
- Email/password authentication
- JWT-based token management
- Social login (Google, GitHub, etc.)
- Magic links
- OAuth providers

### Database Operations
Supabase JavaScript client provides a fluent API for database operations:
```javascript
// Select
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);

// Insert
const { data, error } = await supabase
  .from('users')
  .insert([{ email: 'user@example.com', name: 'John Doe' }]);

// Update
const { data, error } = await supabase
  .from('users')
  .update({ name: 'Jane Doe' })
  .eq('id', userId);

// Delete
const { data, error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

## Database Schema

### User Management

**Important**: Supabase Auth manages users in the `auth.users` table. You **don't create** your own `users` table for authentication.

#### Option A: Store in user_metadata (Recommended for MVP)

Store role and profile data in `user_metadata` during signup:

```typescript
// During signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'  // MVP roles: 'admin', 'user', 'viewer'
    }
  }
});

// Access later
const { data: { user } } = await supabase.auth.getUser();
const role = user?.user_metadata?.role;  // 'admin' | 'user' | 'viewer'
const firstName = user?.user_metadata?.first_name;
```

**MVP Role Hierarchy (3 tiers):**
| Role | Access Level |
|------|--------------|
| `admin` | Full access: user management, settings, all data |
| `user` | Standard: create/manage campaigns, view analytics |
| `viewer` | Read-only: view reports and analytics only |

#### Option B: Create Profiles Table (Future - Complex Data)

For additional profile data or relationships, create a `profiles` table:

```sql
-- Profiles table (references auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    avatar_url TEXT,
    company VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**For this project, we'll use Option A (user_metadata)** for simplicity unless complex profile data is needed.

### Analytics Data Table
```sql
CREATE TABLE analytics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type VARCHAR(100),
    value NUMERIC,
    date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Campaigns Table
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    type VARCHAR(50), -- email, sms, social
    status VARCHAR(50) DEFAULT 'draft',
    content TEXT,
    scheduled_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    report_type VARCHAR(100),
    data JSONB,
    generated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### App Settings Table (MVP)

Stores application-wide settings (single-tenant). White-label instance_config is deferred to Phase D.

```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Integration credentials (encrypted via pgcrypto)
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    sendgrid_api_key TEXT,

    -- Settings
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',

    -- Limits (MVP)
    monthly_sms_limit INTEGER DEFAULT 10000,
    monthly_email_limit INTEGER DEFAULT 50000,

    -- Compliance (MVP)
    data_retention_days INTEGER DEFAULT 30,  -- 30-day MVP retention
    enable_audit_log BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Only admins can manage settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage app settings"
ON app_settings FOR ALL
USING ((auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin');
```

### SMS/Email Message Tracking Tables
```sql
-- SMS messages
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    recipient VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    message_sid VARCHAR(100) UNIQUE,
    status VARCHAR(50), -- queued, sent, delivered, failed, undelivered
    error_code VARCHAR(10),
    segments INTEGER DEFAULT 1,
    cost DECIMAL(10, 4),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_messages_campaign ON sms_messages(campaign_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);

-- Email messages
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    message_id VARCHAR(255) UNIQUE,
    status VARCHAR(50), -- sent, delivered, bounced, opened, clicked
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_type VARCHAR(50), -- hard, soft
    bounce_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_messages_campaign ON email_messages(campaign_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);

-- Email click tracking
CREATE TABLE email_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES email_messages(id),
    url TEXT NOT NULL,
    clicked_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logs Table (30-Day Retention for MVP)

> **Note**: MVP uses 30-day retention for internal debugging. SOC 2 compliance (7-year retention with partitioned tables) is documented in `build-docs/10-future/advanced-compliance.md`.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### Consent Management Tables (GDPR)
```sql
-- SMS consent
CREATE TABLE sms_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_source VARCHAR(50), -- web_form, api, manual
    consented_at TIMESTAMP,
    opt_out_at TIMESTAMP,
    opt_out_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_consent_phone ON sms_consent(phone_number);

-- Email subscriptions
CREATE TABLE email_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed BOOLEAN DEFAULT TRUE,
    subscription_types JSONB DEFAULT '["marketing", "newsletter"]'::jsonb,
    subscribed_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    unsubscribe_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_subscriptions_email ON email_subscriptions(email);
```

### Templates Table
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- sms, email
    subject TEXT, -- For email templates
    content TEXT NOT NULL,
    variables TEXT[], -- Array of variable names
    category VARCHAR(50), -- promotional, transactional, newsletter
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_user ON templates(user_id);
```

---

## Extension Module Tables (Post-MVP)

> **Note**: The following tables are for **post-MVP add-on modules**. Implement these only after core MVP is complete and validated with users.
>
> - **Phase A**: Visual Builders (Week 7-8 post-MVP)
> - **Phase B**: Social Media (Week 9-10 post-MVP)
> - **Phase C**: AI Assistant (Week 11-12 post-MVP)
> - **Phase D**: Enterprise Features (as needed)

### Data Import Framework (MVP Week 3-4)

> **Note**: Data Import is part of MVP scope. These tables are implemented in Week 3-4.

#### Data Sources Table
Stores connection configurations for external data sources.

```sql
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'google_analytics', 'meta_pixel', 'custom_database', 'rest_api', 'csv_upload',
        'postgres', 'mysql', 'mssql', 'redshift', 'bigquery', 'snowflake',
        'csv_url', 'google_sheets', 'excel'
    )),
    credentials JSONB, -- Encrypted OAuth tokens or connection strings
    config JSONB DEFAULT '{}', -- Source-specific configuration
    column_config JSONB DEFAULT '{}', -- Column mappings, cleaning rules, exclusions
    schedule_config JSONB DEFAULT '{}', -- Schedule timing, timezone, retry settings
    sync_schedule VARCHAR(50) DEFAULT 'manual' CHECK (sync_schedule IN ('manual', 'hourly', 'daily', 'weekly', 'monthly', 'cron')),
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ, -- For scheduler to query due syncs
    last_sync_value TEXT, -- For incremental syncs (last ID or timestamp)
    sync_status VARCHAR(50) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'failed')),
    table_name VARCHAR(255), -- Dynamic table name for this import
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_data_sources_user ON data_sources(user_id);
CREATE INDEX idx_data_sources_type ON data_sources(type);
CREATE INDEX idx_data_sources_status ON data_sources(sync_status);
CREATE INDEX idx_data_sources_next_sync ON data_sources(next_sync_at)
    WHERE is_active = TRUE AND sync_schedule != 'manual';
```

#### Import Tables Registry
Tracks dynamically created tables for each data import.

```sql
CREATE TABLE import_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    column_definitions JSONB NOT NULL, -- Column names, types, cleaning rules
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_tables ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_import_tables_source ON import_tables(data_source_id);
```

#### Imported Data Table (Legacy/Normalized)
Normalized storage for analytics metrics (GA4, Meta Pixel).

```sql
CREATE TABLE imported_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC,
    dimensions JSONB DEFAULT '{}', -- Dimension key-value pairs
    event_date DATE NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE imported_data ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_imported_data_source ON imported_data(data_source_id);
CREATE INDEX idx_imported_data_date ON imported_data(event_date);
CREATE INDEX idx_imported_data_metric ON imported_data(metric_name);
```

#### Sync Logs Table
Tracks sync history for debugging and auditing.

```sql
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
    records_imported INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0, -- Rows skipped due to cleaning/filter rules
    error_message TEXT,
    preview_data JSONB, -- Top 10 rows for test connection preview
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sync_logs_source ON sync_logs(data_source_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
```

#### Dynamic Table Creation Function
Creates a dedicated table for each data import.

```sql
CREATE OR REPLACE FUNCTION create_import_table(
    p_user_id UUID,
    p_source_name TEXT,
    p_columns JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_name TEXT;
    v_column_sql TEXT := '';
    v_col JSONB;
BEGIN
    -- Generate safe table name: import_{sanitized_name}_{short_uuid}
    v_table_name := 'import_' ||
        regexp_replace(lower(p_source_name), '[^a-z0-9]', '_', 'g') || '_' ||
        substr(gen_random_uuid()::text, 1, 8);

    -- Build column definitions from included columns
    FOR v_col IN SELECT * FROM jsonb_array_elements(p_columns)
    LOOP
        IF (v_col->>'included')::boolean THEN
            v_column_sql := v_column_sql || format(
                '%I %s,',
                v_col->>'target_name',
                CASE v_col->>'type'
                    WHEN 'number' THEN 'NUMERIC'
                    WHEN 'integer' THEN 'INTEGER'
                    WHEN 'boolean' THEN 'BOOLEAN'
                    WHEN 'date' THEN 'DATE'
                    WHEN 'timestamp' THEN 'TIMESTAMPTZ'
                    ELSE 'TEXT'
                END
            );
        END IF;
    END LOOP;

    -- Create table with standard columns
    EXECUTE format('
        CREATE TABLE %I (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            %s
            imported_at TIMESTAMPTZ DEFAULT NOW()
        )', v_table_name, v_column_sql);

    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);

    -- Create RLS policy tied to data_sources ownership
    EXECUTE format('
        CREATE POLICY "Owner access" ON %I FOR ALL
        USING (EXISTS (
            SELECT 1 FROM import_tables it
            JOIN data_sources ds ON ds.id = it.data_source_id
            WHERE it.table_name = %L AND ds.user_id = %L
        ))', v_table_name, v_table_name, p_user_id);

    RETURN v_table_name;
END;
$$;
```

#### Column Config JSONB Structure
```json
{
  "columns": [
    {
      "source_name": "First Name",
      "target_name": "first_name",
      "type": "text",
      "included": true,
      "cleaning_rules": [
        { "type": "trim" },
        { "type": "title_case" }
      ]
    },
    {
      "source_name": "Email",
      "target_name": "email",
      "type": "text",
      "included": true,
      "cleaning_rules": [
        { "type": "trim" },
        { "type": "lowercase" },
        { "type": "validate_email", "on_invalid": "skip" }
      ]
    }
  ],
  "row_filters": [
    { "column": "status", "operator": "equals", "value": "Active", "action": "include" }
  ],
  "duplicate_handling": "keep_first",
  "duplicate_key_columns": ["email"]
}
```

#### Schedule Config JSONB Structure
```json
{
  "frequency": "daily",
  "time": "09:00",
  "timezone": "America/New_York",
  "day_of_week": 1,
  "day_of_month": 1,
  "cron_expression": "0 9 * * 1-5",
  "retry_on_failure": true,
  "max_retries": 3,
  "retry_delay_minutes": 15,
  "incremental_column": "updated_at",
  "incremental_strategy": "incremental"
}
```

### Visual Builder Suite (Phase A - Post-MVP)

> **Future Feature**: Visual builders are Phase A, 2 weeks post-MVP.

#### Campaign Flows Table
Stores visual workflow definitions using React Flow format.

```sql
CREATE TABLE campaign_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]', -- React Flow nodes
    edges JSONB NOT NULL DEFAULT '[]', -- React Flow edges
    trigger_type VARCHAR(50) CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'segment_entry', 'form_submit')),
    trigger_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_flows ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_campaign_flows_user ON campaign_flows(user_id);
CREATE INDEX idx_campaign_flows_active ON campaign_flows(is_active);
```

#### Flow Executions Table
Tracks individual flow execution instances.

```sql
CREATE TABLE flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES campaign_flows(id) ON DELETE CASCADE,
    contact_id UUID, -- Reference to contact/audience member
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused', 'cancelled')),
    current_node_id VARCHAR(100),
    execution_path JSONB DEFAULT '[]', -- Array of executed node IDs
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_flow_executions_flow ON flow_executions(flow_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_contact ON flow_executions(contact_id);
```

#### Audience Segments Table
Stores dynamic audience segment definitions.

```sql
CREATE TABLE audience_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '[]', -- Visual rule builder output
    is_dynamic BOOLEAN DEFAULT TRUE, -- Auto-update membership
    estimated_size INTEGER,
    last_calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audience_segments_user ON audience_segments(user_id);
```

#### Segment Membership Table
Tracks which contacts belong to which segments.

```sql
CREATE TABLE segment_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID REFERENCES audience_segments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    exited_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE segment_membership ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_segment_membership_segment ON segment_membership(segment_id);
CREATE INDEX idx_segment_membership_contact ON segment_membership(contact_id);
CREATE INDEX idx_segment_membership_active ON segment_membership(is_active);
```

#### Custom Dashboards Table
Stores user-created dashboard layouts.

```sql
CREATE TABLE custom_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL DEFAULT '[]', -- Widget positions and configs
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[], -- Array of user IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_custom_dashboards_user ON custom_dashboards(user_id);
CREATE INDEX idx_custom_dashboards_default ON custom_dashboards(is_default);
```

### Social Media Module (Phase B - Post-MVP)

> **Future Feature**: Social media integration is Phase B, 2 weeks post-MVP.

#### Social Accounts Table
Stores OAuth credentials and account information for social platforms.

```sql
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'twitter', 'tiktok')),
    account_name VARCHAR(255),
    account_id VARCHAR(255), -- Platform's account ID
    page_id VARCHAR(255), -- For Facebook/Instagram pages
    access_token TEXT, -- Encrypted OAuth token
    refresh_token TEXT, -- Encrypted refresh token
    token_expires_at TIMESTAMPTZ,
    permissions JSONB DEFAULT '[]', -- Granted OAuth permissions
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE UNIQUE INDEX idx_social_accounts_unique ON social_accounts(user_id, platform, account_id);
```

#### Social Posts Table
Stores published and scheduled social media posts.

```sql
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media file URLs
    link_url TEXT, -- Optional link to include
    hashtags TEXT[], -- Array of hashtags
    platform_post_id VARCHAR(255), -- Platform's post ID after publishing
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_social_posts_user ON social_posts(user_id);
CREATE INDEX idx_social_posts_campaign ON social_posts(campaign_id);
CREATE INDEX idx_social_posts_account ON social_posts(social_account_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_at);
```

#### Social Engagement Table
Stores engagement metrics for social posts.

```sql
CREATE TABLE social_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0, -- Retweets, reposts
    clicks INTEGER DEFAULT 0, -- Link clicks
    impressions INTEGER DEFAULT 0, -- Total views
    reach INTEGER DEFAULT 0, -- Unique viewers
    engagement_rate NUMERIC(5, 4), -- Calculated rate
    saves INTEGER DEFAULT 0, -- Instagram saves, bookmarks
    video_views INTEGER DEFAULT 0,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_engagement ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_social_engagement_post ON social_engagement(post_id);
CREATE INDEX idx_social_engagement_fetched ON social_engagement(fetched_at DESC);
```

### AI Assistant Module (Phase C - Post-MVP)

> **Future Feature**: AI Assistant (BYOK) is Phase C, 2 weeks post-MVP.

#### AI Providers Table
Stores user's AI provider configurations (BYOK model).

```sql
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('openai', 'anthropic', 'ollama', 'azure_openai', 'custom')),
    api_endpoint TEXT, -- Custom endpoint URL (for Ollama, Azure, custom)
    api_key TEXT, -- Encrypted API key
    model_name VARCHAR(100), -- Default model (e.g., 'gpt-4', 'claude-3-sonnet')
    config JSONB DEFAULT '{}', -- temperature, max_tokens, etc.
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_providers_user ON ai_providers(user_id);
CREATE INDEX idx_ai_providers_type ON ai_providers(provider_type);
```

#### AI Conversations Table
Stores conversation threads with context.

```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    title VARCHAR(255),
    context_type VARCHAR(50) CHECK (context_type IN ('campaign', 'analytics', 'strategy', 'content', 'general')),
    context_data JSONB DEFAULT '{}', -- Snapshot of relevant data
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_context ON ai_conversations(context_type);
CREATE INDEX idx_ai_conversations_archived ON ai_conversations(is_archived);
```

#### AI Messages Table
Stores individual messages within conversations.

```sql
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_input INTEGER, -- Input tokens used
    tokens_output INTEGER, -- Output tokens used
    model_used VARCHAR(100), -- Model that generated response
    latency_ms INTEGER, -- Response time in milliseconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON ai_messages(created_at);
```

#### AI Token Usage Table
Tracks daily token usage per user for accountability.

```sql
CREATE TABLE ai_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0, -- Estimated cost in USD
    UNIQUE(user_id, ai_provider_id, date)
);

ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_token_usage_user ON ai_token_usage(user_id);
CREATE INDEX idx_ai_token_usage_date ON ai_token_usage(date DESC);
CREATE INDEX idx_ai_token_usage_provider ON ai_token_usage(ai_provider_id);
```

#### AI Suggestions Table
Stores actionable AI-generated outputs.

```sql
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN (
        'campaign', 'email_content', 'sms_content', 'social_post',
        'audience_segment', 'strategy', 'subject_line', 'hashtags'
    )),
    title VARCHAR(255),
    content JSONB NOT NULL, -- Structured suggestion data
    reasoning TEXT, -- AI's explanation
    confidence NUMERIC(3, 2), -- Confidence score 0.00-1.00
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'applied', 'modified')),
    applied_to_id UUID, -- Reference to target entity
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ai_suggestions_conversation ON ai_suggestions(conversation_id);
CREATE INDEX idx_ai_suggestions_user ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
```

#### AI Usage Limits Table
Role-based token limits configuration.

```sql
CREATE TABLE ai_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL UNIQUE,
    daily_token_limit INTEGER, -- NULL = unlimited
    monthly_token_limit INTEGER, -- NULL = unlimited
    daily_request_limit INTEGER, -- NULL = unlimited
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits (3-tier MVP roles)
INSERT INTO ai_usage_limits (role, daily_token_limit, monthly_token_limit, daily_request_limit) VALUES
    ('viewer', 0, 0, 0),           -- No AI access
    ('user', 10000, 100000, 50),   -- Standard limits
    ('admin', NULL, NULL, NULL);  -- Unlimited
```

---

## Extension Module RLS Policies

### Data Import RLS
```sql
-- Users can only access their own data sources
CREATE POLICY "Users can manage own data sources"
ON data_sources FOR ALL
USING (user_id = auth.uid());

-- Imported data accessible via data source ownership
CREATE POLICY "Users can view own imported data"
ON imported_data FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM data_sources
        WHERE data_sources.id = imported_data.data_source_id
        AND data_sources.user_id = auth.uid()
    )
);

-- Sync logs accessible via data source ownership
CREATE POLICY "Users can view own sync logs"
ON sync_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM data_sources
        WHERE data_sources.id = sync_logs.data_source_id
        AND data_sources.user_id = auth.uid()
    )
);
```

### Visual Builder RLS
```sql
-- Campaign flows owned by user
CREATE POLICY "Users can manage own flows"
ON campaign_flows FOR ALL
USING (user_id = auth.uid());

-- Audience segments owned by user
CREATE POLICY "Users can manage own segments"
ON audience_segments FOR ALL
USING (user_id = auth.uid());

-- Custom dashboards with sharing support
CREATE POLICY "Users can view own and shared dashboards"
ON custom_dashboards FOR SELECT
USING (
    user_id = auth.uid() OR
    auth.uid() = ANY(shared_with) OR
    (is_shared = TRUE AND user_id IN (
        SELECT id FROM auth.users WHERE
        raw_user_meta_data->>'organization_id' =
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    ))
);

CREATE POLICY "Users can manage own dashboards"
ON custom_dashboards FOR INSERT, UPDATE, DELETE
USING (user_id = auth.uid());
```

### Social Media RLS
```sql
-- Social accounts owned by user
CREATE POLICY "Users can manage own social accounts"
ON social_accounts FOR ALL
USING (user_id = auth.uid());

-- Social posts owned by user
CREATE POLICY "Users can manage own social posts"
ON social_posts FOR ALL
USING (user_id = auth.uid());

-- Engagement metrics via post ownership
CREATE POLICY "Users can view own post engagement"
ON social_engagement FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM social_posts
        WHERE social_posts.id = social_engagement.post_id
        AND social_posts.user_id = auth.uid()
    )
);
```

### AI Assistant RLS
```sql
-- AI providers owned by user
CREATE POLICY "Users can manage own AI providers"
ON ai_providers FOR ALL
USING (user_id = auth.uid());

-- AI conversations owned by user
CREATE POLICY "Users can manage own AI conversations"
ON ai_conversations FOR ALL
USING (user_id = auth.uid());

-- AI messages via conversation ownership
CREATE POLICY "Users can access own AI messages"
ON ai_messages FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM ai_conversations
        WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
);

-- AI suggestions owned by user
CREATE POLICY "Users can manage own AI suggestions"
ON ai_suggestions FOR ALL
USING (user_id = auth.uid());

-- Token usage owned by user (admins can view all)
CREATE POLICY "Users can view own token usage"
ON ai_token_usage FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all token usage"
ON ai_token_usage FOR SELECT
USING (
    (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
);
```

---

## Database Functions for Extension Modules

### Increment Token Usage Function
```sql
CREATE OR REPLACE FUNCTION increment_token_usage(
    p_user_id UUID,
    p_provider_id UUID,
    p_date DATE,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO ai_token_usage (user_id, ai_provider_id, date, input_tokens, output_tokens, request_count, estimated_cost)
    VALUES (p_user_id, p_provider_id, p_date, p_input_tokens, p_output_tokens, 1, p_cost)
    ON CONFLICT (user_id, ai_provider_id, date)
    DO UPDATE SET
        input_tokens = ai_token_usage.input_tokens + p_input_tokens,
        output_tokens = ai_token_usage.output_tokens + p_output_tokens,
        request_count = ai_token_usage.request_count + 1,
        estimated_cost = ai_token_usage.estimated_cost + p_cost;
END;
$$;
```

### Check AI Usage Limits Function
```sql
CREATE OR REPLACE FUNCTION check_ai_usage_limits(p_user_id UUID)
RETURNS TABLE (
    can_use BOOLEAN,
    daily_remaining INTEGER,
    monthly_remaining INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_daily_limit INTEGER;
    v_monthly_limit INTEGER;
    v_daily_usage INTEGER;
    v_monthly_usage INTEGER;
BEGIN
    -- Get user's role
    SELECT raw_user_meta_data->>'role' INTO v_role
    FROM auth.users WHERE id = p_user_id;

    -- Get limits for role
    SELECT daily_token_limit, monthly_token_limit
    INTO v_daily_limit, v_monthly_limit
    FROM ai_usage_limits WHERE role = COALESCE(v_role, 'user');

    -- Get current usage
    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) INTO v_daily_usage
    FROM ai_token_usage
    WHERE user_id = p_user_id AND date = CURRENT_DATE;

    SELECT COALESCE(SUM(input_tokens + output_tokens), 0) INTO v_monthly_usage
    FROM ai_token_usage
    WHERE user_id = p_user_id
    AND date >= date_trunc('month', CURRENT_DATE);

    -- Check limits (NULL = unlimited)
    IF v_daily_limit IS NOT NULL AND v_daily_usage >= v_daily_limit THEN
        RETURN QUERY SELECT FALSE, 0, v_monthly_limit - v_monthly_usage, 'Daily token limit exceeded';
        RETURN;
    END IF;

    IF v_monthly_limit IS NOT NULL AND v_monthly_usage >= v_monthly_limit THEN
        RETURN QUERY SELECT FALSE, v_daily_limit - v_daily_usage, 0, 'Monthly token limit exceeded';
        RETURN;
    END IF;

    RETURN QUERY SELECT
        TRUE,
        COALESCE(v_daily_limit - v_daily_usage, 999999999),
        COALESCE(v_monthly_limit - v_monthly_usage, 999999999),
        'OK'::TEXT;
END;
$$;
```

### Calculate Segment Size Function
```sql
CREATE OR REPLACE FUNCTION calculate_segment_size(p_segment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- This is a placeholder - actual implementation depends on contact table structure
    SELECT COUNT(*) INTO v_count
    FROM segment_membership
    WHERE segment_id = p_segment_id AND is_active = TRUE;

    UPDATE audience_segments
    SET estimated_size = v_count, last_calculated_at = NOW()
    WHERE id = p_segment_id;

    RETURN v_count;
END;
$$;
```

---

## Migration Summary

### MVP Migrations (6 Weeks)

| # | Migration | Week | Description |
|---|-----------|------|-------------|
| 1 | 001_rate_limiting.sql | Done | Login attempt tracking |
| 2 | 002_audit_logs.sql | Done | Audit logging (30-day retention) |
| 3 | 003_analytics.sql | 1-2 | Analytics data |
| 4 | 004_campaigns.sql | 3-4 | Campaign management |
| 5 | 005_templates.sql | 3-4 | Message templates |
| 6 | 006_consent.sql | 3-4 | SMS/Email consent (TCPA/CAN-SPAM) |
| 7 | 007_messages.sql | 5-6 | Message delivery tracking |
| 8 | 008_data_sources.sql | 3-4 | Data import framework |
| 9 | 009_app_settings.sql | 5-6 | Application settings |

### Post-MVP Migrations (Add-on Modules)

| # | Migration | Phase | Description |
|---|-----------|-------|-------------|
| 10 | 010_visual_builders.sql | Phase A | Flow, segment, dashboard builders |
| 11 | 011_social_media.sql | Phase B | Social account connections |
| 12 | 012_ai_assistant.sql | Phase C | AI provider, conversations, tokens |
| 13 | 013_profiles.sql | Phase D | Extended user profiles |
| 14 | 014_instance_config.sql | Phase D | White-label multi-instance |
| 15 | 015_mfa.sql | Phase D | MFA recovery codes |
| 16 | 016_gdpr.sql | Phase D | Full GDPR data requests |

---

## Supabase Features Used

### Authentication
- Email/password authentication
- JWT-based token management
- Role-based access control

### Real-time Capabilities
- Real-time data updates for dashboards
- Presence detection for active users

### Storage
- File storage for report exports and media

## API Endpoints

### Authentication
- `POST /auth/sign-up` - User registration
- `POST /auth/sign-in` - User login
- `POST /auth/sign-out` - User logout
- `GET /auth/user` - Get current user info

### Analytics
- `GET /api/analytics` - Fetch analytics data
- `POST /api/analytics` - Create new analytics record

### Campaigns
- `GET /api/campaigns` - Fetch campaigns
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Reports
- `GET /api/reports` - Fetch reports
- `POST /api/reports` - Generate new report
- `GET /api/reports/:id/export` - Export report

## Data Relationships

- Users can create multiple campaigns
- Campaigns can have multiple reports
- Analytics data is linked to users
- All tables have proper foreign key relationships
- Soft delete patterns implemented for data integrity

## Row-Level Security (RLS) Policies

### Enable RLS on All Tables
```sql
-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
```

### Example RLS Policies

```sql
-- Campaigns: Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns"
ON campaigns FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own campaigns"
ON campaigns FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaigns"
ON campaigns FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaigns"
ON campaigns FOR DELETE
USING (user_id = auth.uid());

-- Admins can view all campaigns (using user_metadata)
CREATE POLICY "Admins can view all campaigns"
ON campaigns FOR SELECT
USING (
  (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
);

-- Reports: Similar policies for reports
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reports"
ON reports FOR SELECT
USING (
  (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
);

-- Audit logs: Only admins can view
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin'
);
```

### Helper Functions for RLS

```sql
-- Helper function to check user role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->>'user_metadata')::jsonb->>'role',
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage in RLS policies (3-tier MVP roles)
-- Example: Using the helper function
CREATE POLICY "example_admin_only"
ON some_table FOR ALL
USING (public.get_user_role() = 'admin');
```

**Note**: When using `user_metadata` for roles, access them via `auth.jwt()` in RLS policies. If using a `profiles` table, join with `profiles` instead.

## Security Considerations

- Row-level security policies enforced on all tables
- JWT token validation for API access
- Password hashing with bcrypt (handled by Supabase Auth)
- Input sanitization and validation
- CORS configuration for API endpoints
- Encrypted storage for sensitive credentials (API keys, tokens)
- Audit logging for all data modifications
- Regular security audits and penetration testing