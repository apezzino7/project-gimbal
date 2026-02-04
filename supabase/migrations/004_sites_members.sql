-- Sites & Members Migration
-- Multi-site member management with hierarchical structure and custom membership levels

-- =============================================================================
-- Sites Table: Multi-location with hierarchy
-- =============================================================================

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,

  -- Hierarchy (site → region → company)
  parent_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  site_level VARCHAR(20) NOT NULL DEFAULT 'site'
    CHECK (site_level IN ('company', 'region', 'site')),

  -- Location & compliance
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(2), -- For TCPA quiet hours by state
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York', -- TCPA compliance

  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),

  -- CAC tracking
  default_acquisition_cost NUMERIC(10, 2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sites_code_unique UNIQUE(user_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_parent ON sites(parent_site_id);
CREATE INDEX IF NOT EXISTS idx_sites_level ON sites(site_level);
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Membership Levels Table: Per-site custom tiers
-- =============================================================================

CREATE TABLE IF NOT EXISTS membership_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Level info
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  display_order INTEGER DEFAULT 0,

  -- Benefits (flexible JSON)
  benefits JSONB DEFAULT '{}',
  -- Example: { "discount": 10, "priority_booking": true, "free_classes": 5 }

  -- LTV thresholds for auto-upgrade (optional)
  min_lifetime_value NUMERIC(10, 2),
  min_visit_count INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT membership_levels_site_code_unique UNIQUE(site_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_membership_levels_site ON membership_levels(site_id);
CREATE INDEX IF NOT EXISTS idx_membership_levels_active ON membership_levels(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Members Table: Core contact/member records
-- =============================================================================

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  membership_level_id UUID REFERENCES membership_levels(id) ON DELETE SET NULL,

  -- External system reference
  external_id VARCHAR(255),

  -- Identity
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20), -- Stored as E.164 format (+1XXXXXXXXXX)

  -- Demographics
  date_of_birth DATE,
  gender VARCHAR(20),

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',

  -- Membership
  membership_start_date DATE,
  membership_expiry_date DATE,
  membership_status VARCHAR(20) DEFAULT 'active'
    CHECK (membership_status IN ('active', 'expired', 'cancelled', 'suspended', 'pending')),

  -- Computed fields (updated by triggers)
  total_visits INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  total_transactions NUMERIC(12, 2) DEFAULT 0,
  lifetime_value NUMERIC(12, 2) DEFAULT 0,
  average_transaction NUMERIC(10, 2) DEFAULT 0,

  -- Acquisition attribution for CAC
  acquisition_source VARCHAR(100), -- 'campaign', 'promo_code', 'referral', 'organic', 'import'
  acquisition_campaign_id UUID, -- FK to campaigns table (added later)
  acquisition_promo_code VARCHAR(50),
  acquisition_cost NUMERIC(10, 2), -- Actual CAC for this member
  acquisition_date DATE DEFAULT CURRENT_DATE,

  -- Flexible storage
  tags TEXT[], -- ['vip', 'high-value', 'at-risk']
  custom_fields JSONB DEFAULT '{}', -- Any additional fields from import
  source_import_id VARCHAR(100), -- Track which import created/updated this

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraints (within same site)
  CONSTRAINT members_site_email_unique UNIQUE(site_id, email),
  CONSTRAINT members_site_phone_unique UNIQUE(site_id, phone)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_site_id ON members(site_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_external_id ON members(site_id, external_id);
CREATE INDEX IF NOT EXISTS idx_members_membership_level ON members(membership_level_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_ltv ON members(lifetime_value DESC);
CREATE INDEX IF NOT EXISTS idx_members_acquisition ON members(acquisition_source, acquisition_date);
CREATE INDEX IF NOT EXISTS idx_members_last_visit ON members(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_members_expiry ON members(membership_expiry_date)
  WHERE membership_status = 'active';
CREATE INDEX IF NOT EXISTS idx_members_birthday ON members(
  EXTRACT(MONTH FROM date_of_birth),
  EXTRACT(DAY FROM date_of_birth)
) WHERE date_of_birth IS NOT NULL;

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Sites RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sites"
  ON sites FOR ALL
  USING (user_id = auth.uid());

-- Membership Levels RLS (via site ownership)
ALTER TABLE membership_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage membership levels for own sites"
  ON membership_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = membership_levels.site_id
      AND sites.user_id = auth.uid()
    )
  );

-- Members RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own members"
  ON members FOR ALL
  USING (user_id = auth.uid());

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Get site hierarchy (all children of a site)
CREATE OR REPLACE FUNCTION get_site_hierarchy(p_site_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  code VARCHAR(50),
  site_level VARCHAR(20),
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE site_tree AS (
    -- Base case: the starting site
    SELECT s.id, s.name, s.code, s.site_level, 0 AS depth
    FROM sites s
    WHERE s.id = p_site_id

    UNION ALL

    -- Recursive case: children
    SELECT s.id, s.name, s.code, s.site_level, st.depth + 1
    FROM sites s
    INNER JOIN site_tree st ON s.parent_site_id = st.id
  )
  SELECT * FROM site_tree ORDER BY depth, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get member count by site (with rollup for regions/company)
CREATE OR REPLACE FUNCTION get_site_member_count(p_site_id UUID, p_include_children BOOLEAN DEFAULT FALSE)
RETURNS INTEGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF p_include_children THEN
    SELECT COUNT(*) INTO member_count
    FROM members m
    WHERE m.site_id IN (
      SELECT h.id FROM get_site_hierarchy(p_site_id) h
    )
    AND m.is_active = TRUE;
  ELSE
    SELECT COUNT(*) INTO member_count
    FROM members m
    WHERE m.site_id = p_site_id
    AND m.is_active = TRUE;
  END IF;

  RETURN member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Search members with filters
CREATE OR REPLACE FUNCTION search_members(
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_membership_status TEXT DEFAULT NULL,
  p_membership_level_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  membership_status VARCHAR(20),
  membership_level_name VARCHAR(100),
  lifetime_value NUMERIC(12, 2),
  total_visits INTEGER,
  last_visit_at TIMESTAMPTZ,
  site_name VARCHAR(255),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.phone,
    m.membership_status,
    ml.name AS membership_level_name,
    m.lifetime_value,
    m.total_visits,
    m.last_visit_at,
    s.name AS site_name,
    m.created_at
  FROM members m
  LEFT JOIN membership_levels ml ON m.membership_level_id = ml.id
  LEFT JOIN sites s ON m.site_id = s.id
  WHERE m.user_id = p_user_id
    AND m.is_active = TRUE
    AND (p_site_id IS NULL OR m.site_id = p_site_id)
    AND (p_membership_status IS NULL OR m.membership_status = p_membership_status)
    AND (p_membership_level_id IS NULL OR m.membership_level_id = p_membership_level_id)
    AND (p_tags IS NULL OR m.tags && p_tags)
    AND (
      p_search_term IS NULL
      OR m.first_name ILIKE '%' || p_search_term || '%'
      OR m.last_name ILIKE '%' || p_search_term || '%'
      OR m.email ILIKE '%' || p_search_term || '%'
      OR m.phone ILIKE '%' || p_search_term || '%'
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Audit Logging for Member Changes
-- =============================================================================

CREATE OR REPLACE FUNCTION log_member_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'MEMBER_CREATED',
      NEW.email,
      NULL,
      jsonb_build_object(
        'member_id', NEW.id,
        'site_id', NEW.site_id,
        'acquisition_source', NEW.acquisition_source
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log significant changes
    IF OLD.membership_status != NEW.membership_status THEN
      PERFORM log_audit_event(
        'MEMBER_STATUS_CHANGED',
        NEW.email,
        NULL,
        jsonb_build_object(
          'member_id', NEW.id,
          'old_status', OLD.membership_status,
          'new_status', NEW.membership_status
        )
      );
    END IF;
    IF OLD.membership_level_id IS DISTINCT FROM NEW.membership_level_id THEN
      PERFORM log_audit_event(
        'MEMBER_LEVEL_CHANGED',
        NEW.email,
        NULL,
        jsonb_build_object(
          'member_id', NEW.id,
          'old_level', OLD.membership_level_id,
          'new_level', NEW.membership_level_id
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'MEMBER_DELETED',
      OLD.email,
      NULL,
      jsonb_build_object('member_id', OLD.id, 'site_id', OLD.site_id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_member_audit
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION log_member_change();
