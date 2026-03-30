-- ═══════════════════════════════════════════════════════
-- Migration 003: Row-Level Security (RLS) Policies
-- Enforces tenant isolation at the database layer.
-- Session variables set by tenant middleware:
--   app.current_org_id   — the authenticated user's org
--   app.accessible_bu_ids — comma-separated BU IDs
--   app.bu_isolation      — whether BU-level filtering is on
-- ═══════════════════════════════════════════════════════

-- Helper: safely read a session variable (returns '' if not set)
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_org_id', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION accessible_bu_ids() RETURNS TEXT[] AS $$
BEGIN
  RETURN string_to_array(COALESCE(current_setting('app.accessible_bu_ids', true), ''), ',');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION bu_isolation_enabled() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bu_isolation', true), 'true') = 'true';
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Enable RLS on tenant-scoped tables ──

ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ── Business Units ──
-- Users can only see BUs in their org
CREATE POLICY bus_tenant_isolation ON business_units
  FOR ALL
  USING (
    current_org_id() = '' -- bypass when no tenant context (e.g. platform admin)
    OR "orgId" = current_org_id()
  );

-- ── Users ──
-- Users can only see other users in their org
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (
    current_org_id() = '' -- bypass
    OR "orgId" = current_org_id()
    OR "orgId" IS NULL -- platform-level users visible to all
  );

-- ── User Org Roles ──
-- Role assignments scoped to org, with optional BU filtering
CREATE POLICY user_org_roles_tenant_isolation ON user_org_roles
  FOR ALL
  USING (
    current_org_id() = '' -- bypass
    OR "orgId" = current_org_id()
  );

CREATE POLICY user_org_roles_bu_isolation ON user_org_roles
  FOR ALL
  USING (
    NOT bu_isolation_enabled()           -- BU isolation off → see all
    OR "buId" IS NULL                    -- org-level roles always visible
    OR "buId" = ANY(accessible_bu_ids()) -- BU-scoped: must be in accessible list
  );

-- ── Sessions ──
-- Sessions visible only for users in the same org
CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (
    current_org_id() = ''
    OR "userId" IN (
      SELECT id FROM users WHERE "orgId" = current_org_id()
    )
  );

-- ── Refresh Tokens ──
-- Same as sessions
CREATE POLICY refresh_tokens_tenant_isolation ON refresh_tokens
  FOR ALL
  USING (
    current_org_id() = ''
    OR "userId" IN (
      SELECT id FROM users WHERE "orgId" = current_org_id()
    )
  );

-- ── IMPORTANT: The app connects as the DB owner, so RLS is bypassed by default.
-- Force RLS for the application role too:
ALTER TABLE business_units FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE user_org_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
