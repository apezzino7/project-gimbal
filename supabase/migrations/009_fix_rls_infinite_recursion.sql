-- Migration: 009_fix_rls_infinite_recursion
-- Description: Fix infinite recursion in RLS policies by using SECURITY DEFINER functions
-- Author: Claude
-- Date: 2026-02-05

-- =============================================================================
-- Create helper function that bypasses RLS to check admin status
-- =============================================================================

-- Drop existing functions if they exist (to allow recreation)
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS get_my_role();

-- Function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- Fix Profiles RLS Policies
-- =============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Recreate policies using the helper function
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    -- Allow self-insert during signup
    auth.uid() = id
  );

-- =============================================================================
-- Fix App Settings RLS Policies
-- =============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can read settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON app_settings;

-- Recreate policies using the helper function
CREATE POLICY "Admins can read settings"
  ON app_settings FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (is_admin());

-- =============================================================================
-- Fix Audit Logs RLS Policies
-- =============================================================================

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;

-- Recreate policy using the helper function
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- =============================================================================
-- Update existing helper functions to use the new approach
-- =============================================================================

-- Update get_user_role to use the new function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN get_my_role();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update has_role to avoid recursion
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_my_role();

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
