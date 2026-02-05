-- Migration: 008_profiles_app_settings
-- Description: User profiles with RBAC and application settings
-- Author: Claude
-- Date: 2026-02-04

-- =============================================================================
-- User Profiles Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'user', 'viewer')),
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Profiles Triggers
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- =============================================================================
-- Profiles Row Level Security
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can insert profiles (for inviting users)
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    -- Allow self-insert during signup
    auth.uid() = id
  );

-- =============================================================================
-- Auto-create Profile on Signup
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_display_name TEXT;
  v_profile_count INTEGER;
BEGIN
  -- Determine role: first user becomes admin, others become viewer
  SELECT COUNT(*) INTO v_profile_count FROM profiles;

  IF v_profile_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
  END IF;

  -- Get display name from metadata or generate from email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (NEW.id, NEW.email, v_role, v_display_name);

  -- Log the new user creation
  PERFORM log_audit_event(
    'USER_CREATED',
    NEW.email,
    NULL,
    jsonb_build_object(
      'user_id', NEW.id,
      'role', v_role,
      'display_name', v_display_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists (for re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- Application Settings Table (Singleton)
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Twilio Settings
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  -- SendGrid Settings
  sendgrid_api_key TEXT,
  sendgrid_from_email TEXT,
  sendgrid_from_name TEXT,
  -- General Settings
  company_name TEXT DEFAULT 'Company',
  company_address TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  -- Rate Limits
  monthly_sms_limit INTEGER DEFAULT 10000,
  monthly_email_limit INTEGER DEFAULT 50000,
  -- Data Retention
  data_retention_days INTEGER DEFAULT 30,
  audit_retention_days INTEGER DEFAULT 30,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Update timestamp trigger
CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- =============================================================================
-- App Settings Row Level Security
-- =============================================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read settings
CREATE POLICY "Admins can read settings"
  ON app_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can insert settings (for initial setup)
CREATE POLICY "Admins can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Insert default settings row
INSERT INTO app_settings (id, company_name)
VALUES (gen_random_uuid(), 'Project Gimbal')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has required role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy: admin > user > viewer
  IF required_role = 'viewer' THEN
    RETURN user_role IN ('admin', 'user', 'viewer');
  ELSIF required_role = 'user' THEN
    RETURN user_role IN ('admin', 'user');
  ELSIF required_role = 'admin' THEN
    RETURN user_role = 'admin';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET last_login_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Audit Log Enhancements
-- =============================================================================

-- Allow admins to read all audit logs
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =============================================================================
-- Profile Audit Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION log_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log role changes
    IF OLD.role != NEW.role THEN
      PERFORM log_audit_event(
        'ROLE_CHANGED',
        NEW.email,
        NULL,
        jsonb_build_object(
          'user_id', NEW.id,
          'old_role', OLD.role,
          'new_role', NEW.role
        )
      );
    END IF;

    -- Log activation/deactivation
    IF OLD.is_active != NEW.is_active THEN
      PERFORM log_audit_event(
        CASE WHEN NEW.is_active THEN 'USER_ACTIVATED' ELSE 'USER_DEACTIVATED' END,
        NEW.email,
        NULL,
        jsonb_build_object('user_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_profiles_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_change();

-- =============================================================================
-- App Settings Audit Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log settings changes (don't log actual credentials)
    PERFORM log_audit_event(
      'SETTINGS_UPDATED',
      NULL,
      NULL,
      jsonb_build_object(
        'fields_changed', (
          SELECT jsonb_agg(key)
          FROM jsonb_each_text(to_jsonb(NEW))
          WHERE to_jsonb(NEW) -> key != to_jsonb(OLD) -> key
            AND key NOT IN ('twilio_auth_token', 'sendgrid_api_key', 'updated_at')
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_app_settings_audit
  AFTER UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION log_settings_change();

-- =============================================================================
-- Increment Campaign Stat Function (for webhooks)
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campaign_id UUID,
  p_field TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE campaigns SET %I = COALESCE(%I, 0) + 1, updated_at = NOW() WHERE id = $1',
    p_field, p_field
  ) USING p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
