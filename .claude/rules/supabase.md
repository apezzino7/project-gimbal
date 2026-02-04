---
description: Supabase and database development rules
globs:
  - supabase/**/*
  - src/lib/supabase.ts
---

# Supabase Development Rules

## Client Configuration
The Supabase client (`src/lib/supabase.ts`) is configured with:
- PKCE authentication flow (required for security)
- Auto token refresh enabled
- Session persistence in localStorage
- Storage key: `gimbal-auth-token`

Never modify auth configuration without security review.

## Migration Files

### Naming Convention
`NNN_description.sql` (e.g., `001_rate_limiting.sql`)

### Structure Template
```sql
-- Migration: NNN_description
-- Description: What this migration does
-- Author: Your name
-- Date: YYYY-MM-DD

-- Up migration
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS (REQUIRED for all tables)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX idx_table_name_user_id ON table_name(user_id);

-- Down migration (in comments)
-- DROP TABLE IF EXISTS table_name;
```

## Row-Level Security (RLS)

REQUIRED for all tables. Common patterns:

```sql
-- Users see only their own data
CREATE POLICY "Users read own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Insert with ownership
CREATE POLICY "Users insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin full access
CREATE POLICY "Admins full access"
  ON table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );
```

## Database Functions

Use SECURITY DEFINER for functions called by clients:

```sql
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_email TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (event_type, email, metadata)
  VALUES (p_event_type, lower(trim(p_email)), p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

## RPC Calls from Client
```tsx
const { data, error } = await supabase.rpc('function_name', {
  p_param1: value1,
  p_param2: value2,
});

if (error) throw new ServiceError('RPC call failed', error);
```

## Real-time Subscriptions
```tsx
useEffect(() => {
  const subscription = supabase
    .channel('table_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'campaigns' },
      (payload) => handleChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

## Edge Functions

Location: `supabase/functions/function-name/index.ts`

```tsx
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify JWT
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  // Function logic...

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Data Sanitization
Always sanitize in database functions:
```sql
-- Sanitize email
lower(trim(p_email))

-- Sanitize text
regexp_replace(p_text, '[<>]', '', 'g')
```

## Indexes
Create indexes for:
- Foreign keys
- Frequently filtered columns
- Sorting columns
- Composite indexes for common query patterns

```sql
CREATE INDEX idx_campaigns_user_status
  ON campaigns(user_id, status);
```
