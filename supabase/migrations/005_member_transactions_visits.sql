-- Member Transactions & Visits Migration
-- Transaction history for LTV calculation and visit tracking for engagement

-- =============================================================================
-- Member Transactions Table: For LTV Calculation
-- =============================================================================

CREATE TABLE IF NOT EXISTS member_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- External reference
  external_transaction_id VARCHAR(255),

  -- Transaction details
  transaction_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'purchase'
    CHECK (transaction_type IN ('purchase', 'membership_fee', 'refund', 'credit', 'adjustment')),

  -- Attribution
  promo_code VARCHAR(50),
  campaign_id UUID, -- FK to campaigns table (added later)

  -- Details
  description TEXT,
  line_items JSONB DEFAULT '[]',
  -- Example: [{ "name": "Monthly Membership", "qty": 1, "amount": 49.99 }]

  -- Metadata
  metadata JSONB DEFAULT '{}',
  source_import_id VARCHAR(100), -- Track which import created this

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_transactions_member ON member_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_transactions_site ON member_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_member_transactions_date ON member_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_member_transactions_type ON member_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_member_transactions_external ON member_transactions(site_id, external_transaction_id);
CREATE INDEX IF NOT EXISTS idx_member_transactions_promo ON member_transactions(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_member_transactions_campaign ON member_transactions(campaign_id) WHERE campaign_id IS NOT NULL;

-- =============================================================================
-- Member Visits Table: For Engagement Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS member_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Visit details
  visit_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,

  -- Visit classification
  visit_type VARCHAR(50) DEFAULT 'regular'
    CHECK (visit_type IN ('regular', 'class', 'appointment', 'event', 'trial', 'other')),

  -- Optional details
  service_name VARCHAR(255), -- e.g., "Yoga Class", "Personal Training"
  staff_member VARCHAR(255),
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  source_import_id VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate check-ins
  CONSTRAINT member_visits_unique UNIQUE(member_id, site_id, visit_date, check_in_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_visits_member ON member_visits(member_id);
CREATE INDEX IF NOT EXISTS idx_member_visits_site ON member_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_member_visits_date ON member_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_member_visits_type ON member_visits(visit_type);
CREATE INDEX IF NOT EXISTS idx_member_visits_member_date ON member_visits(member_id, visit_date DESC);

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Transactions RLS
ALTER TABLE member_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage transactions for own members"
  ON member_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = member_transactions.member_id
      AND members.user_id = auth.uid()
    )
  );

-- Visits RLS
ALTER TABLE member_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage visits for own members"
  ON member_visits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = member_visits.member_id
      AND members.user_id = auth.uid()
    )
  );

-- =============================================================================
-- LTV Calculation Trigger
-- =============================================================================

-- Function: Update member LTV and transaction stats
CREATE OR REPLACE FUNCTION update_member_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_member_id UUID;
  v_total_transactions NUMERIC(12, 2);
  v_transaction_count INTEGER;
  v_avg_transaction NUMERIC(10, 2);
BEGIN
  -- Get the member_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_member_id := OLD.member_id;
  ELSE
    v_member_id := NEW.member_id;
  END IF;

  -- Calculate aggregates (only count positive-value transactions for LTV)
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type IN ('purchase', 'membership_fee') THEN amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(amount), 0),
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(amount), 0) / COUNT(*) ELSE 0 END
  INTO v_total_transactions, v_total_transactions, v_transaction_count, v_avg_transaction
  FROM member_transactions
  WHERE member_id = v_member_id;

  -- Recalculate LTV properly
  SELECT
    COALESCE(SUM(
      CASE
        WHEN transaction_type IN ('purchase', 'membership_fee') THEN amount
        WHEN transaction_type = 'refund' THEN -ABS(amount)
        WHEN transaction_type = 'credit' THEN amount
        WHEN transaction_type = 'adjustment' THEN amount
        ELSE 0
      END
    ), 0)
  INTO v_total_transactions
  FROM member_transactions
  WHERE member_id = v_member_id;

  -- Update member record
  UPDATE members SET
    lifetime_value = v_total_transactions,
    total_transactions = v_total_transactions,
    average_transaction = v_avg_transaction,
    updated_at = NOW()
  WHERE id = v_member_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for transaction changes
CREATE TRIGGER trigger_update_member_ltv
  AFTER INSERT OR UPDATE OR DELETE ON member_transactions
  FOR EACH ROW EXECUTE FUNCTION update_member_stats();

-- =============================================================================
-- Visit Count Trigger
-- =============================================================================

-- Function: Update member visit stats
CREATE OR REPLACE FUNCTION update_member_visit_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_member_id UUID;
  v_total_visits INTEGER;
  v_last_visit TIMESTAMPTZ;
BEGIN
  -- Get the member_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_member_id := OLD.member_id;
  ELSE
    v_member_id := NEW.member_id;
  END IF;

  -- Calculate visit aggregates
  SELECT
    COUNT(*),
    MAX(COALESCE(check_in_time, visit_date::TIMESTAMPTZ))
  INTO v_total_visits, v_last_visit
  FROM member_visits
  WHERE member_id = v_member_id;

  -- Update member record
  UPDATE members SET
    total_visits = v_total_visits,
    last_visit_at = v_last_visit,
    updated_at = NOW()
  WHERE id = v_member_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for visit changes
CREATE TRIGGER trigger_update_member_visits
  AFTER INSERT OR UPDATE OR DELETE ON member_visits
  FOR EACH ROW EXECUTE FUNCTION update_member_visit_stats();

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE TRIGGER trigger_member_transactions_updated_at
  BEFORE UPDATE ON member_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Get member LTV breakdown
CREATE OR REPLACE FUNCTION get_member_ltv_breakdown(p_member_id UUID)
RETURNS TABLE (
  transaction_type VARCHAR(50),
  total_amount NUMERIC(12, 2),
  transaction_count BIGINT,
  first_transaction TIMESTAMPTZ,
  last_transaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.transaction_type,
    SUM(mt.amount) AS total_amount,
    COUNT(*) AS transaction_count,
    MIN(mt.transaction_date) AS first_transaction,
    MAX(mt.transaction_date) AS last_transaction
  FROM member_transactions mt
  WHERE mt.member_id = p_member_id
  GROUP BY mt.transaction_type
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get member visit history with stats
CREATE OR REPLACE FUNCTION get_member_visit_stats(p_member_id UUID)
RETURNS TABLE (
  total_visits BIGINT,
  visits_this_month BIGINT,
  visits_last_month BIGINT,
  visits_this_year BIGINT,
  avg_visits_per_month NUMERIC(5, 2),
  first_visit DATE,
  last_visit DATE,
  most_common_visit_type VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  WITH visit_stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE visit_date >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month,
      COUNT(*) FILTER (WHERE visit_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                        AND visit_date < DATE_TRUNC('month', CURRENT_DATE)) AS last_month,
      COUNT(*) FILTER (WHERE visit_date >= DATE_TRUNC('year', CURRENT_DATE)) AS this_year,
      MIN(visit_date) AS first_v,
      MAX(visit_date) AS last_v,
      CASE
        WHEN MIN(visit_date) IS NOT NULL THEN
          COUNT(*)::NUMERIC / GREATEST(1,
            EXTRACT(EPOCH FROM (MAX(visit_date) - MIN(visit_date))) / (30 * 24 * 60 * 60)
          )
        ELSE 0
      END AS avg_per_month
    FROM member_visits
    WHERE member_id = p_member_id
  ),
  common_type AS (
    SELECT visit_type
    FROM member_visits
    WHERE member_id = p_member_id
    GROUP BY visit_type
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    vs.total,
    vs.this_month,
    vs.last_month,
    vs.this_year,
    ROUND(vs.avg_per_month, 2),
    vs.first_v,
    vs.last_v,
    ct.visit_type
  FROM visit_stats vs
  LEFT JOIN common_type ct ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get site transaction summary (with hierarchy rollup)
CREATE OR REPLACE FUNCTION get_site_transaction_summary(
  p_site_id UUID,
  p_include_children BOOLEAN DEFAULT FALSE,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC(12, 2),
  total_refunds NUMERIC(12, 2),
  net_revenue NUMERIC(12, 2),
  transaction_count BIGINT,
  average_transaction NUMERIC(10, 2),
  unique_members BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN mt.transaction_type IN ('purchase', 'membership_fee') THEN mt.amount ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN mt.transaction_type = 'refund' THEN ABS(mt.amount) ELSE 0 END), 0) AS total_refunds,
    COALESCE(SUM(
      CASE
        WHEN mt.transaction_type IN ('purchase', 'membership_fee') THEN mt.amount
        WHEN mt.transaction_type = 'refund' THEN -ABS(mt.amount)
        ELSE mt.amount
      END
    ), 0) AS net_revenue,
    COUNT(*) AS transaction_count,
    CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(mt.amount), 0) / COUNT(*) ELSE 0 END AS average_transaction,
    COUNT(DISTINCT mt.member_id) AS unique_members
  FROM member_transactions mt
  WHERE (
    p_include_children
    AND mt.site_id IN (SELECT h.id FROM get_site_hierarchy(p_site_id) h)
  ) OR (
    NOT p_include_children
    AND mt.site_id = p_site_id
  )
  AND (p_start_date IS NULL OR mt.transaction_date >= p_start_date)
  AND (p_end_date IS NULL OR mt.transaction_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Audit Logging for Transactions
-- =============================================================================

CREATE OR REPLACE FUNCTION log_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'TRANSACTION_CREATED',
      NULL,
      NULL,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'member_id', NEW.member_id,
        'amount', NEW.amount,
        'type', NEW.transaction_type
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'TRANSACTION_DELETED',
      NULL,
      NULL,
      jsonb_build_object(
        'transaction_id', OLD.id,
        'member_id', OLD.member_id,
        'amount', OLD.amount
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_transaction_audit
  AFTER INSERT OR DELETE ON member_transactions
  FOR EACH ROW EXECUTE FUNCTION log_transaction_change();
