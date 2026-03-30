-- ═══════════════════════════════════════════════════════
-- Sprint 20-23: RLS Policies for Currency, Workflows,
-- API Keys, and Webhooks Tables
-- Reuses helper functions from migration 003 (current_org_id, etc.)
-- ═══════════════════════════════════════════════════════

-- ── exchange_rates ── (orgId nullable — platform defaults have null)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates FORCE ROW LEVEL SECURITY;
CREATE POLICY exchange_rates_tenant_isolation ON exchange_rates
  FOR ALL USING (
    current_org_id() = ''
    OR "orgId" IS NULL
    OR "orgId" = current_org_id()
  );

-- ── workflow_templates ──
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY workflow_templates_tenant_isolation ON workflow_templates
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── workflow_instances ──
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances FORCE ROW LEVEL SECURITY;
CREATE POLICY workflow_instances_tenant_isolation ON workflow_instances
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── api_keys ──
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant_isolation ON api_keys
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── webhooks ──
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;
CREATE POLICY webhooks_tenant_isolation ON webhooks
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
