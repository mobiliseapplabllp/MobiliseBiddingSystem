-- ═══════════════════════════════════════════════════════
-- Sprint 13-15: RLS Policies for Supplier Portal Tables
-- Reuses helper functions from migration 003 (current_org_id, etc.)
-- ═══════════════════════════════════════════════════════

-- ── supplier_profiles ──
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_profiles_tenant_isolation ON supplier_profiles
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── supplier_documents ──
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_documents_tenant_isolation ON supplier_documents
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── supplier_qualifications ──
ALTER TABLE supplier_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_qualifications FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_qualifications_tenant_isolation ON supplier_qualifications
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── supplier_scorecards ──
ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_scorecards FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_scorecards_tenant_isolation ON supplier_scorecards
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
