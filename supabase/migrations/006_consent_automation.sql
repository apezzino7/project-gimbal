-- Consent & Automation Migration
-- TCPA/CAN-SPAM consent tracking and automation trigger definitions

-- =============================================================================
-- Member Consent Table: TCPA/CAN-SPAM Compliance
-- =============================================================================

CREATE TABLE IF NOT EXISTS member_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,

  -- SMS Consent (TCPA)
  sms_consent BOOLEAN DEFAULT FALSE,
  sms_consent_source VARCHAR(100), -- 'import', 'web_form', 'in_person', 'api'
  sms_consented_at TIMESTAMPTZ,
  sms_consent_ip VARCHAR(45), -- IPv4/IPv6
  sms_opt_out_at TIMESTAMPTZ,
  sms_opt_out_reason VARCHAR(255),

  -- Email Consent (CAN-SPAM)
  email_consent BOOLEAN DEFAULT TRUE, -- Default opt-in for existing relationships
  email_consent_source VARCHAR(100),
  email_consented_at TIMESTAMPTZ,
  email_unsubscribed_at TIMESTAMPTZ,
  email_unsubscribe_reason VARCHAR(255),

  -- Global preferences
  do_not_contact BOOLEAN DEFAULT FALSE, -- Master opt-out
  preferred_channel VARCHAR(20) DEFAULT 'email'
    CHECK (preferred_channel IN ('sms', 'email', 'both', 'none')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_consent_member ON member_consent(member_id);
CREATE INDEX IF NOT EXISTS idx_member_consent_sms ON member_consent(sms_consent) WHERE sms_consent = TRUE;
CREATE INDEX IF NOT EXISTS idx_member_consent_email ON member_consent(email_consent) WHERE email_consent = TRUE;
CREATE INDEX IF NOT EXISTS idx_member_consent_dnc ON member_consent(do_not_contact) WHERE do_not_contact = TRUE;

-- =============================================================================
-- Promo Codes Table: For CAC Attribution
-- =============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL = global

  -- Code details
  code VARCHAR(50) NOT NULL,
  description TEXT,

  -- Attribution
  campaign_id UUID, -- FK to campaigns table (added later)
  acquisition_cost NUMERIC(10, 2), -- CAC attributed to this code

  -- Validity
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique code per user (site-scoped or global)
  CONSTRAINT promo_codes_user_code_unique UNIQUE(user_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_user ON promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_site ON promo_codes(site_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until)
  WHERE is_active = TRUE;

-- =============================================================================
-- Automation Triggers Table: Time & Event-Based Automations
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL = all sites

  -- Trigger info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger type and configuration
  trigger_type VARCHAR(50) NOT NULL
    CHECK (trigger_type IN (
      -- Time-based
      'birthday',
      'membership_anniversary',
      'days_since_visit',
      'days_since_transaction',
      'membership_expiring',
      'scheduled', -- Custom date/time

      -- Event-based
      'new_member',
      'member_status_change',
      'visit_milestone',
      'ltv_milestone',
      'tag_added',
      'tag_removed'
    )),

  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- birthday: { "days_before": 7 }
  -- days_since_visit: { "days": 30 }
  -- membership_expiring: { "days_before": 14 }
  -- visit_milestone: { "counts": [10, 25, 50, 100] }
  -- ltv_milestone: { "amounts": [100, 500, 1000, 5000] }
  -- new_member: { "delay_hours": 24 }
  -- scheduled: { "date": "2024-12-25", "time": "09:00" }

  -- Action configuration
  action_type VARCHAR(50) NOT NULL
    CHECK (action_type IN ('send_sms', 'send_email', 'add_tag', 'remove_tag', 'webhook', 'update_field')),

  action_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- send_sms: { "template_id": "uuid", "message": "Happy Birthday {{firstName}}!" }
  -- send_email: { "template_id": "uuid", "subject": "We miss you!" }
  -- add_tag: { "tag": "at-risk" }
  -- webhook: { "url": "https://...", "method": "POST" }

  -- Scheduling
  run_time TIME DEFAULT '09:00:00', -- Default 9 AM for time-based triggers
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,0}', -- All days by default (0=Sunday)

  -- Filtering
  membership_level_ids UUID[], -- NULL = all levels
  membership_statuses TEXT[] DEFAULT '{active}',
  required_tags TEXT[], -- Member must have all these tags
  excluded_tags TEXT[], -- Member must not have any of these tags

  -- Rate limiting
  min_interval_days INTEGER DEFAULT 0, -- Minimum days between sends to same member
  max_sends_per_member INTEGER, -- NULL = unlimited

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_triggers_user ON automation_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_site ON automation_triggers(site_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_type ON automation_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_active ON automation_triggers(is_active, next_run_at)
  WHERE is_active = TRUE;

-- =============================================================================
-- Automation Execution Log: Track trigger executions
-- =============================================================================

CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES automation_triggers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Execution details
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),

  -- Result
  result_message TEXT,
  result_metadata JSONB DEFAULT '{}',

  -- For tracking send intervals
  action_type VARCHAR(50) NOT NULL,

  -- Index for quick lookups
  CONSTRAINT automation_executions_unique UNIQUE(trigger_id, member_id, executed_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_trigger ON automation_executions(trigger_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_member ON automation_executions(member_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_date ON automation_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_automation_executions_member_trigger ON automation_executions(member_id, trigger_id, executed_at DESC);

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Consent RLS
ALTER TABLE member_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage consent for own members"
  ON member_consent FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = member_consent.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Promo Codes RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own promo codes"
  ON promo_codes FOR ALL
  USING (user_id = auth.uid());

-- Automation Triggers RLS
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own automation triggers"
  ON automation_triggers FOR ALL
  USING (user_id = auth.uid());

-- Automation Executions RLS
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions for own triggers"
  ON automation_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automation_triggers
      WHERE automation_triggers.id = automation_executions.trigger_id
      AND automation_triggers.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE TRIGGER trigger_member_consent_updated_at
  BEFORE UPDATE ON member_consent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_automation_triggers_updated_at
  BEFORE UPDATE ON automation_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Check if member can receive SMS (TCPA compliant)
CREATE OR REPLACE FUNCTION can_send_sms(
  p_member_id UUID,
  p_site_timezone VARCHAR DEFAULT 'America/New_York'
)
RETURNS TABLE (
  can_send BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_consent RECORD;
  v_member RECORD;
  v_local_hour INTEGER;
BEGIN
  -- Get consent record
  SELECT * INTO v_consent
  FROM member_consent
  WHERE member_id = p_member_id;

  -- Get member record
  SELECT * INTO v_member
  FROM members
  WHERE id = p_member_id;

  -- Check if member exists
  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Member not found'::TEXT;
    RETURN;
  END IF;

  -- Check if phone exists
  IF v_member.phone IS NULL OR v_member.phone = '' THEN
    RETURN QUERY SELECT FALSE, 'No phone number'::TEXT;
    RETURN;
  END IF;

  -- Check do not contact
  IF v_consent IS NOT NULL AND v_consent.do_not_contact THEN
    RETURN QUERY SELECT FALSE, 'Do not contact flag set'::TEXT;
    RETURN;
  END IF;

  -- Check SMS consent
  IF v_consent IS NULL OR NOT v_consent.sms_consent THEN
    RETURN QUERY SELECT FALSE, 'No SMS consent'::TEXT;
    RETURN;
  END IF;

  -- Check opt-out
  IF v_consent.sms_opt_out_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Member opted out of SMS'::TEXT;
    RETURN;
  END IF;

  -- Check TCPA quiet hours (8 AM - 9 PM in member's timezone)
  v_local_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE p_site_timezone);
  IF v_local_hour < 8 OR v_local_hour >= 21 THEN
    RETURN QUERY SELECT FALSE, 'Outside TCPA quiet hours (8 AM - 9 PM)'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if member can receive email
CREATE OR REPLACE FUNCTION can_send_email(p_member_id UUID)
RETURNS TABLE (
  can_send BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_consent RECORD;
  v_member RECORD;
BEGIN
  -- Get consent record
  SELECT * INTO v_consent
  FROM member_consent
  WHERE member_id = p_member_id;

  -- Get member record
  SELECT * INTO v_member
  FROM members
  WHERE id = p_member_id;

  -- Check if member exists
  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Member not found'::TEXT;
    RETURN;
  END IF;

  -- Check if email exists
  IF v_member.email IS NULL OR v_member.email = '' THEN
    RETURN QUERY SELECT FALSE, 'No email address'::TEXT;
    RETURN;
  END IF;

  -- Check do not contact
  IF v_consent IS NOT NULL AND v_consent.do_not_contact THEN
    RETURN QUERY SELECT FALSE, 'Do not contact flag set'::TEXT;
    RETURN;
  END IF;

  -- Check email unsubscribe
  IF v_consent IS NOT NULL AND v_consent.email_unsubscribed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Member unsubscribed from email'::TEXT;
    RETURN;
  END IF;

  -- Check email consent (default true for existing relationships)
  IF v_consent IS NOT NULL AND NOT v_consent.email_consent THEN
    RETURN QUERY SELECT FALSE, 'No email consent'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record SMS opt-out (STOP keyword)
CREATE OR REPLACE FUNCTION record_sms_opt_out(
  p_phone VARCHAR,
  p_reason VARCHAR DEFAULT 'STOP keyword received'
)
RETURNS VOID AS $$
BEGIN
  UPDATE member_consent
  SET
    sms_consent = FALSE,
    sms_opt_out_at = NOW(),
    sms_opt_out_reason = p_reason,
    updated_at = NOW()
  WHERE member_id IN (
    SELECT id FROM members WHERE phone = p_phone
  );

  -- Log the opt-out
  PERFORM log_audit_event(
    'SMS_OPT_OUT',
    NULL,
    NULL,
    jsonb_build_object('phone', p_phone, 'reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record email unsubscribe
CREATE OR REPLACE FUNCTION record_email_unsubscribe(
  p_email VARCHAR,
  p_reason VARCHAR DEFAULT 'User unsubscribed'
)
RETURNS VOID AS $$
BEGIN
  UPDATE member_consent
  SET
    email_consent = FALSE,
    email_unsubscribed_at = NOW(),
    email_unsubscribe_reason = p_reason,
    updated_at = NOW()
  WHERE member_id IN (
    SELECT id FROM members WHERE email = LOWER(TRIM(p_email))
  );

  -- Log the unsubscribe
  PERFORM log_audit_event(
    'EMAIL_UNSUBSCRIBE',
    p_email,
    NULL,
    jsonb_build_object('reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get members eligible for a trigger
CREATE OR REPLACE FUNCTION get_trigger_eligible_members(p_trigger_id UUID)
RETURNS TABLE (
  member_id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  site_id UUID,
  site_timezone VARCHAR(50)
) AS $$
DECLARE
  v_trigger RECORD;
BEGIN
  -- Get trigger configuration
  SELECT * INTO v_trigger
  FROM automation_triggers
  WHERE id = p_trigger_id AND is_active = TRUE;

  IF v_trigger IS NULL THEN
    RETURN;
  END IF;

  -- Return eligible members based on trigger type
  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.first_name,
    m.last_name,
    m.email,
    m.phone,
    m.site_id,
    s.timezone AS site_timezone
  FROM members m
  INNER JOIN sites s ON m.site_id = s.id
  LEFT JOIN member_consent mc ON m.id = mc.member_id
  WHERE m.user_id = v_trigger.user_id
    AND m.is_active = TRUE
    AND (v_trigger.site_id IS NULL OR m.site_id = v_trigger.site_id)
    AND (v_trigger.membership_level_ids IS NULL OR m.membership_level_id = ANY(v_trigger.membership_level_ids))
    AND (v_trigger.membership_statuses IS NULL OR m.membership_status = ANY(v_trigger.membership_statuses))
    AND (v_trigger.required_tags IS NULL OR m.tags @> v_trigger.required_tags)
    AND (v_trigger.excluded_tags IS NULL OR NOT (m.tags && v_trigger.excluded_tags))
    -- Check consent based on action type
    AND (
      (v_trigger.action_type != 'send_sms' OR (mc.sms_consent = TRUE AND mc.sms_opt_out_at IS NULL))
      AND (v_trigger.action_type != 'send_email' OR (mc.email_consent = TRUE AND mc.email_unsubscribed_at IS NULL))
    )
    -- Check do not contact
    AND (mc.do_not_contact IS NULL OR mc.do_not_contact = FALSE)
    -- Check min interval
    AND (
      v_trigger.min_interval_days = 0
      OR NOT EXISTS (
        SELECT 1 FROM automation_executions ae
        WHERE ae.trigger_id = p_trigger_id
          AND ae.member_id = m.id
          AND ae.executed_at > NOW() - (v_trigger.min_interval_days || ' days')::INTERVAL
      )
    )
    -- Check max sends
    AND (
      v_trigger.max_sends_per_member IS NULL
      OR (
        SELECT COUNT(*) FROM automation_executions ae
        WHERE ae.trigger_id = p_trigger_id AND ae.member_id = m.id
      ) < v_trigger.max_sends_per_member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate and lookup promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR,
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  promo_code_id UUID,
  acquisition_cost NUMERIC(10, 2),
  campaign_id UUID,
  message TEXT
) AS $$
DECLARE
  v_promo RECORD;
BEGIN
  -- Find the promo code
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE user_id = p_user_id
    AND UPPER(code) = UPPER(p_code)
    AND (site_id IS NULL OR site_id = p_site_id);

  IF v_promo IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::UUID, 'Invalid promo code'::TEXT;
    RETURN;
  END IF;

  -- Check if active
  IF NOT v_promo.is_active THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::UUID, 'Promo code is inactive'::TEXT;
    RETURN;
  END IF;

  -- Check date validity
  IF v_promo.valid_from IS NOT NULL AND CURRENT_DATE < v_promo.valid_from THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::UUID, 'Promo code not yet valid'::TEXT;
    RETURN;
  END IF;

  IF v_promo.valid_until IS NOT NULL AND CURRENT_DATE > v_promo.valid_until THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::UUID, 'Promo code expired'::TEXT;
    RETURN;
  END IF;

  -- Check usage limit
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::NUMERIC, NULL::UUID, 'Promo code usage limit reached'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_promo.id, v_promo.acquisition_cost, v_promo.campaign_id, 'Valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment promo code usage
CREATE OR REPLACE FUNCTION use_promo_code(p_promo_code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Audit Logging
-- =============================================================================

CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'CONSENT_CREATED',
      NULL,
      NULL,
      jsonb_build_object(
        'member_id', NEW.member_id,
        'sms_consent', NEW.sms_consent,
        'email_consent', NEW.email_consent
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log SMS consent changes
    IF OLD.sms_consent IS DISTINCT FROM NEW.sms_consent THEN
      PERFORM log_audit_event(
        CASE WHEN NEW.sms_consent THEN 'SMS_CONSENT_GRANTED' ELSE 'SMS_CONSENT_REVOKED' END,
        NULL,
        NULL,
        jsonb_build_object('member_id', NEW.member_id)
      );
    END IF;
    -- Log email consent changes
    IF OLD.email_consent IS DISTINCT FROM NEW.email_consent THEN
      PERFORM log_audit_event(
        CASE WHEN NEW.email_consent THEN 'EMAIL_CONSENT_GRANTED' ELSE 'EMAIL_CONSENT_REVOKED' END,
        NULL,
        NULL,
        jsonb_build_object('member_id', NEW.member_id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_consent_audit
  AFTER INSERT OR UPDATE ON member_consent
  FOR EACH ROW EXECUTE FUNCTION log_consent_change();
