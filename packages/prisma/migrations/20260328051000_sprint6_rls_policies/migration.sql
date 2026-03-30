-- ═══════════════════════════════════════════════════════
-- Sprint 6: RLS Policies for Auction Tables
-- Reuses helper functions from migration 003 (current_org_id, etc.)
-- ═══════════════════════════════════════════════════════

-- ── auctions ──
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions FORCE ROW LEVEL SECURITY;
CREATE POLICY auctions_tenant_isolation ON auctions
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── auction_lots ──
ALTER TABLE auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY auction_lots_tenant_isolation ON auction_lots
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── auction_line_items ──
ALTER TABLE auction_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY auction_line_items_tenant_isolation ON auction_line_items
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── auction_invitations ──
ALTER TABLE auction_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY auction_invitations_tenant_isolation ON auction_invitations
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── auction_bids ──
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids FORCE ROW LEVEL SECURITY;
CREATE POLICY auction_bids_tenant_isolation ON auction_bids
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

-- ── auction_extensions ──
ALTER TABLE auction_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_extensions FORCE ROW LEVEL SECURITY;
CREATE POLICY auction_extensions_tenant_isolation ON auction_extensions
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
