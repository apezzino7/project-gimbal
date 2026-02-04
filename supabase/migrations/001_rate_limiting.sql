-- Rate Limiting Migration
-- Tracks login attempts for server-side rate limiting enforcement

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- Create index for fast lookups by email and time
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts(email, attempted_at);

-- Create index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at
  ON login_attempts(attempted_at);

-- Function: Check if an account is locked out
-- Returns true if 5+ failed attempts in the last 15 minutes
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT COUNT(*) >= 5
  FROM login_attempts
  WHERE email = lower(trim(user_email))
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get lockout time remaining in minutes
CREATE OR REPLACE FUNCTION get_lockout_time_remaining(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  oldest_attempt TIMESTAMPTZ;
  lockout_end TIMESTAMPTZ;
BEGIN
  SELECT MIN(attempted_at) INTO oldest_attempt
  FROM (
    SELECT attempted_at
    FROM login_attempts
    WHERE email = lower(trim(user_email))
      AND success = FALSE
      AND attempted_at > NOW() - INTERVAL '15 minutes'
    ORDER BY attempted_at DESC
    LIMIT 5
  ) recent;

  IF oldest_attempt IS NULL THEN
    RETURN 0;
  END IF;

  lockout_end := oldest_attempt + INTERVAL '15 minutes';

  IF lockout_end <= NOW() THEN
    RETURN 0;
  END IF;

  RETURN CEIL(EXTRACT(EPOCH FROM (lockout_end - NOW())) / 60);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record a login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  user_email TEXT,
  user_ip TEXT DEFAULT NULL,
  was_success BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (email, ip_address, success)
  VALUES (lower(trim(user_email)), user_ip, was_success);

  -- Cleanup: Remove attempts older than 24 hours
  DELETE FROM login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset attempts for an email (called after successful login)
CREATE OR REPLACE FUNCTION reset_login_attempts(user_email TEXT)
RETURNS VOID AS $$
  DELETE FROM login_attempts
  WHERE email = lower(trim(user_email));
$$ LANGUAGE SQL SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow inserts from authenticated and anonymous users
CREATE POLICY "Allow insert login attempts"
  ON login_attempts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: No direct reads allowed (use functions instead)
-- This prevents clients from reading other users' login attempts
