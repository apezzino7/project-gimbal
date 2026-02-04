-- Campaigns Migration
-- Campaign management with templates and message tracking
-- Integrates with existing consent system from 006_consent_automation.sql

-- =============================================================================
-- Campaign Templates Table (must be created first for FK reference)
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('sms', 'email')),

  -- Content
  subject VARCHAR(255), -- Email only
  content TEXT NOT NULL,
  preheader VARCHAR(150), -- Email preview text

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique name per user
  CONSTRAINT campaign_templates_user_name_unique UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_templates_user ON campaign_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON campaign_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_active ON campaign_templates(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Campaigns Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL, -- NULL = all sites

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(20) NOT NULL CHECK (campaign_type IN ('sms', 'email')),

  -- Status tracking (DRAFT → SCHEDULED → SENDING → SENT → FAILED)
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),

  -- Template & Content
  template_id UUID REFERENCES campaign_templates(id) ON DELETE SET NULL,
  subject VARCHAR(255), -- Email only
  content TEXT NOT NULL, -- Message body with {{variable}} placeholders

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Targeting
  target_all_members BOOLEAN DEFAULT FALSE,
  membership_level_ids UUID[], -- Filter by membership levels
  membership_statuses TEXT[] DEFAULT '{active}', -- Filter by status
  required_tags TEXT[], -- Must have ALL these tags
  excluded_tags TEXT[], -- Must NOT have ANY of these tags

  -- Statistics (denormalized for performance)
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,   -- Email only
  total_clicked INTEGER DEFAULT 0,  -- Email only
  total_bounced INTEGER DEFAULT 0,  -- Email only
  total_unsubscribed INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_site ON campaigns(site_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaigns_type_status ON campaigns(campaign_type, status);

-- =============================================================================
-- Campaign Messages Table (individual message tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Message details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient_address VARCHAR(255) NOT NULL, -- Phone or email

  -- Status tracking (queued → sent → delivered → opened → clicked → bounced → failed)
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Provider tracking
  external_id VARCHAR(255), -- Twilio SID or SendGrid ID
  provider_status VARCHAR(100),
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- One message per member per campaign
  CONSTRAINT campaign_messages_unique UNIQUE(campaign_id, member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_member ON campaign_messages(member_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_status ON campaign_messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_external ON campaign_messages(external_id)
  WHERE external_id IS NOT NULL;

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Campaign Templates RLS
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON campaign_templates FOR ALL
  USING (user_id = auth.uid());

-- Campaigns RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own campaigns"
  ON campaigns FOR ALL
  USING (user_id = auth.uid());

-- Campaign Messages RLS
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for own campaigns"
  ON campaign_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for own campaigns"
  ON campaign_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages for own campaigns"
  ON campaign_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Get eligible recipients for a campaign (with consent checks)
CREATE OR REPLACE FUNCTION get_campaign_recipients(p_campaign_id UUID)
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
  v_campaign RECORD;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF v_campaign IS NULL THEN
    RETURN;
  END IF;

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
  WHERE m.user_id = v_campaign.user_id
    AND m.is_active = TRUE
    -- Site filter
    AND (v_campaign.site_id IS NULL OR m.site_id = v_campaign.site_id)
    -- Targeting filters
    AND (
      v_campaign.target_all_members = TRUE
      OR (
        (v_campaign.membership_level_ids IS NULL
          OR m.membership_level_id = ANY(v_campaign.membership_level_ids))
        AND (v_campaign.membership_statuses IS NULL
          OR m.membership_status = ANY(v_campaign.membership_statuses))
        AND (v_campaign.required_tags IS NULL
          OR m.tags @> v_campaign.required_tags)
        AND (v_campaign.excluded_tags IS NULL
          OR NOT (m.tags && v_campaign.excluded_tags))
      )
    )
    -- Consent checks based on campaign type
    AND (
      -- SMS: Requires consent, no opt-out, not DNC
      (v_campaign.campaign_type = 'sms'
        AND m.phone IS NOT NULL
        AND (mc.sms_consent = TRUE)
        AND (mc.sms_opt_out_at IS NULL)
        AND (mc.do_not_contact IS NULL OR mc.do_not_contact = FALSE))
      OR
      -- Email: Default consent is true, check unsubscribe, not DNC
      (v_campaign.campaign_type = 'email'
        AND m.email IS NOT NULL
        AND (mc.email_consent = TRUE OR mc.email_consent IS NULL)
        AND (mc.email_unsubscribed_at IS NULL)
        AND (mc.do_not_contact IS NULL OR mc.do_not_contact = FALSE))
    )
    -- Exclude members already messaged in this campaign
    AND NOT EXISTS (
      SELECT 1 FROM campaign_messages cm
      WHERE cm.campaign_id = p_campaign_id
      AND cm.member_id = m.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update campaign statistics from message counts
CREATE OR REPLACE FUNCTION update_campaign_stats(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns SET
    total_sent = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id AND status != 'queued'
    ),
    total_delivered = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id
      AND status IN ('delivered', 'opened', 'clicked')
    ),
    total_failed = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id AND status = 'failed'
    ),
    total_opened = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL
    ),
    total_clicked = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id AND clicked_at IS NOT NULL
    ),
    total_bounced = (
      SELECT COUNT(*) FROM campaign_messages
      WHERE campaign_id = p_campaign_id AND status = 'bounced'
    ),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get campaign metrics
CREATE OR REPLACE FUNCTION get_campaign_metrics(p_campaign_id UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  total_sent INTEGER,
  total_delivered INTEGER,
  total_failed INTEGER,
  total_opened INTEGER,
  total_clicked INTEGER,
  total_bounced INTEGER,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  bounce_rate NUMERIC
) AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF v_campaign IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_campaign.total_recipients,
    v_campaign.total_sent,
    v_campaign.total_delivered,
    v_campaign.total_failed,
    v_campaign.total_opened,
    v_campaign.total_clicked,
    v_campaign.total_bounced,
    CASE WHEN v_campaign.total_sent > 0
      THEN ROUND((v_campaign.total_delivered::NUMERIC / v_campaign.total_sent) * 100, 2)
      ELSE 0
    END AS delivery_rate,
    CASE WHEN v_campaign.total_delivered > 0
      THEN ROUND((v_campaign.total_opened::NUMERIC / v_campaign.total_delivered) * 100, 2)
      ELSE 0
    END AS open_rate,
    CASE WHEN v_campaign.total_opened > 0
      THEN ROUND((v_campaign.total_clicked::NUMERIC / v_campaign.total_opened) * 100, 2)
      ELSE 0
    END AS click_rate,
    CASE WHEN v_campaign.total_sent > 0
      THEN ROUND((v_campaign.total_bounced::NUMERIC / v_campaign.total_sent) * 100, 2)
      ELSE 0
    END AS bounce_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Queue messages for a campaign
CREATE OR REPLACE FUNCTION queue_campaign_messages(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_campaign RECORD;
  v_count INTEGER := 0;
  v_recipient RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF v_campaign IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_campaign.status != 'draft' AND v_campaign.status != 'scheduled' THEN
    RAISE EXCEPTION 'Campaign must be in draft or scheduled status';
  END IF;

  -- Insert messages for all eligible recipients
  FOR v_recipient IN
    SELECT * FROM get_campaign_recipients(p_campaign_id)
  LOOP
    INSERT INTO campaign_messages (
      campaign_id,
      member_id,
      channel,
      recipient_address,
      status
    ) VALUES (
      p_campaign_id,
      v_recipient.member_id,
      v_campaign.campaign_type,
      CASE WHEN v_campaign.campaign_type = 'sms'
        THEN v_recipient.phone
        ELSE v_recipient.email
      END,
      'queued'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Update campaign recipient count
  UPDATE campaigns
  SET total_recipients = v_count,
      updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Add FK from promo_codes to campaigns (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_promo_codes_campaign'
  ) THEN
    ALTER TABLE promo_codes
      ADD CONSTRAINT fk_promo_codes_campaign
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- Audit Logging for Campaign Events
-- =============================================================================

CREATE OR REPLACE FUNCTION log_campaign_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'CAMPAIGN_CREATED',
      NULL,
      NULL,
      jsonb_build_object(
        'campaign_id', NEW.id,
        'campaign_type', NEW.campaign_type,
        'name', NEW.name
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      PERFORM log_audit_event(
        CASE NEW.status
          WHEN 'scheduled' THEN 'CAMPAIGN_SCHEDULED'
          WHEN 'sending' THEN 'CAMPAIGN_STARTED'
          WHEN 'sent' THEN 'CAMPAIGN_COMPLETED'
          WHEN 'failed' THEN 'CAMPAIGN_FAILED'
          WHEN 'cancelled' THEN 'CAMPAIGN_CANCELLED'
          ELSE 'CAMPAIGN_STATUS_CHANGED'
        END,
        NULL,
        NULL,
        jsonb_build_object(
          'campaign_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'CAMPAIGN_DELETED',
      NULL,
      NULL,
      jsonb_build_object('campaign_id', OLD.id, 'name', OLD.name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_campaign_audit
  AFTER INSERT OR UPDATE OR DELETE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION log_campaign_change();
