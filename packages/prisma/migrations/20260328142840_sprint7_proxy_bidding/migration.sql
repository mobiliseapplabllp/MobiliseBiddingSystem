-- CreateTable
CREATE TABLE "proxy_bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "minPrice" DECIMAL(65,30) NOT NULL,
    "decrementStep" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "totalBidsPlaced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxy_bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proxy_bids_auctionId_idx" ON "proxy_bids"("auctionId");

-- CreateIndex
CREATE INDEX "proxy_bids_orgId_idx" ON "proxy_bids"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "proxy_bids_auctionId_supplierId_key" ON "proxy_bids"("auctionId", "supplierId");

-- AddForeignKey
ALTER TABLE "proxy_bids" ADD CONSTRAINT "proxy_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_bids" ADD CONSTRAINT "proxy_bids_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "auction_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS for proxy_bids
ALTER TABLE proxy_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_bids FORCE ROW LEVEL SECURITY;
CREATE POLICY proxy_bids_tenant_isolation ON proxy_bids
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
