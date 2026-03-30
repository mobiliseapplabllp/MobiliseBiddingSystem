-- ═══════════════════════════════════════════════════════
-- Sprint 12: RLS Policies for Contract Tables
-- Reuses helper functions from migration 003 (current_org_id, etc.)
-- ═══════════════════════════════════════════════════════

-- ── contracts ──
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
CREATE POLICY contracts_tenant_isolation ON contracts
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── contract_amendments ──
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments FORCE ROW LEVEL SECURITY;
CREATE POLICY contract_amendments_tenant_isolation ON contract_amendments
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
