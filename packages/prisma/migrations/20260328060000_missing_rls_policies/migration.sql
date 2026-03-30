-- ═══════════════════════════════════════════════════════
-- Security Fix: Missing RLS Policies
-- Tables from Sprints 2-5 that were missing tenant isolation.
-- Reuses helper functions from migration 003.
-- ═══════════════════════════════════════════════════════

-- ── rfx_events ──
ALTER TABLE rfx_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfx_events FORCE ROW LEVEL SECURITY;
CREATE POLICY rfx_events_tenant_isolation ON rfx_events
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── rfx_lots ──
ALTER TABLE rfx_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfx_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY rfx_lots_tenant_isolation ON rfx_lots
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── rfx_line_items ──
ALTER TABLE rfx_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfx_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY rfx_line_items_tenant_isolation ON rfx_line_items
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── supplier_invitations ──
ALTER TABLE supplier_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_invitations_tenant_isolation ON supplier_invitations
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── bid_submissions ──
ALTER TABLE bid_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY bid_submissions_tenant_isolation ON bid_submissions
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── bid_line_items ──
ALTER TABLE bid_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY bid_line_items_tenant_isolation ON bid_line_items
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── bid_documents ──
ALTER TABLE bid_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY bid_documents_tenant_isolation ON bid_documents
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── rfx_templates ──
ALTER TABLE rfx_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfx_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY rfx_templates_tenant_isolation ON rfx_templates
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── audit_logs (nullable orgId — allow platform-level logs) ──
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL USING (current_org_id() = '' OR "orgId" IS NULL OR "orgId" = current_org_id());

-- ── analytics_events (nullable orgId — allow platform-level events) ──
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;
CREATE POLICY analytics_events_tenant_isolation ON analytics_events
  FOR ALL USING (current_org_id() = '' OR "orgId" IS NULL OR "orgId" = current_org_id());
