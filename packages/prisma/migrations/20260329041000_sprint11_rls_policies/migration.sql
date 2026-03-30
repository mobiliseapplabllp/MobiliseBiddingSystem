-- ═══════════════════════════════════════════════════════
-- Sprint 11: RLS Policies for Award Tables
-- Reuses helper functions from migration 003 (current_org_id, etc.)
-- ═══════════════════════════════════════════════════════

-- ── awards ──
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards FORCE ROW LEVEL SECURITY;
CREATE POLICY awards_tenant_isolation ON awards
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── award_items ──
ALTER TABLE award_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_items FORCE ROW LEVEL SECURITY;
CREATE POLICY award_items_tenant_isolation ON award_items
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── award_approvals ──
ALTER TABLE award_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_approvals FORCE ROW LEVEL SECURITY;
CREATE POLICY award_approvals_tenant_isolation ON award_approvals
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
