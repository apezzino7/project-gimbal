-- Audit Logs Migration
-- Stores security and authentication events for compliance and monitoring

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_email ON audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_email_created ON audit_logs(email, created_at);

-- Function: Log an audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_email TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO audit_logs (event_type, email, user_agent, metadata)
  VALUES (p_event_type, lower(trim(p_email)), p_user_agent, p_metadata)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get recent audit logs for a user
-- Only accessible to the user themselves or admins
CREATE OR REPLACE FUNCTION get_user_audit_logs(
  p_email TEXT,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  id UUID,
  event_type TEXT,
  email TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify the requesting user is the same as the email being queried
  -- or is an admin (you'd add admin check logic here)
  IF auth.email() != lower(trim(p_email)) THEN
    RAISE EXCEPTION 'Unauthorized access to audit logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.event_type,
    al.email,
    al.user_agent,
    al.metadata,
    al.created_at
  FROM audit_logs al
  WHERE al.email = lower(trim(p_email))
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow inserts from authenticated and anonymous users
CREATE POLICY "Allow insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can only read their own audit logs
CREATE POLICY "Users can read own audit logs"
  ON audit_logs
  FOR SELECT
  USING (email = auth.email());

-- Cleanup function: Remove old audit logs (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
