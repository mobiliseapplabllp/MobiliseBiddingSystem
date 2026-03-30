-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "rfxEventId" TEXT,
    "refNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "auctionType" TEXT NOT NULL DEFAULT 'ENGLISH',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "reservePrice" DECIMAL(65,30),
    "startingPrice" DECIMAL(65,30),
    "decrementMin" DECIMAL(65,30),
    "decrementMax" DECIMAL(65,30),
    "extensionMinutes" INTEGER NOT NULL DEFAULT 5,
    "extensionTriggerMinutes" INTEGER NOT NULL DEFAULT 5,
    "maxExtensions" INTEGER,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "bidVisibility" TEXT NOT NULL DEFAULT 'RANK_ONLY',
    "allowTiedBids" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_lots" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lotNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT,
    "reservePrice" DECIMAL(65,30),
    "startingPrice" DECIMAL(65,30),
    "decrementMin" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_line_items" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "uom" TEXT,
    "targetPrice" DECIMAL(65,30),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_invitations" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierEmail" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "lotId" TEXT,
    "invitationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bidPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rank" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rejectionReason" TEXT,
    "bidNumber" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_extensions" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "triggeredByBidId" TEXT,
    "previousEndAt" TIMESTAMP(3) NOT NULL,
    "newEndAt" TIMESTAMP(3) NOT NULL,
    "extensionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auctions_orgId_idx" ON "auctions"("orgId");

-- CreateIndex
CREATE INDEX "auctions_buId_idx" ON "auctions"("buId");

-- CreateIndex
CREATE INDEX "auctions_rfxEventId_idx" ON "auctions"("rfxEventId");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "auctions_startAt_idx" ON "auctions"("startAt");

-- CreateIndex
CREATE INDEX "auctions_endAt_idx" ON "auctions"("endAt");

-- CreateIndex
CREATE INDEX "auctions_createdAt_idx" ON "auctions"("createdAt");

-- CreateIndex
CREATE INDEX "auction_lots_auctionId_idx" ON "auction_lots"("auctionId");

-- CreateIndex
CREATE INDEX "auction_lots_orgId_idx" ON "auction_lots"("orgId");

-- CreateIndex
CREATE INDEX "auction_line_items_lotId_idx" ON "auction_line_items"("lotId");

-- CreateIndex
CREATE INDEX "auction_line_items_orgId_idx" ON "auction_line_items"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_invitations_token_key" ON "auction_invitations"("token");

-- CreateIndex
CREATE INDEX "auction_invitations_auctionId_idx" ON "auction_invitations"("auctionId");

-- CreateIndex
CREATE INDEX "auction_invitations_orgId_idx" ON "auction_invitations"("orgId");

-- CreateIndex
CREATE INDEX "auction_invitations_supplierId_idx" ON "auction_invitations"("supplierId");

-- CreateIndex
CREATE INDEX "auction_invitations_token_idx" ON "auction_invitations"("token");

-- CreateIndex
CREATE INDEX "auction_bids_auctionId_idx" ON "auction_bids"("auctionId");

-- CreateIndex
CREATE INDEX "auction_bids_lotId_idx" ON "auction_bids"("lotId");

-- CreateIndex
CREATE INDEX "auction_bids_supplierId_idx" ON "auction_bids"("supplierId");

-- CreateIndex
CREATE INDEX "auction_bids_orgId_idx" ON "auction_bids"("orgId");

-- CreateIndex
CREATE INDEX "auction_bids_placedAt_idx" ON "auction_bids"("placedAt");

-- CreateIndex
CREATE INDEX "auction_bids_auctionId_lotId_supplierId_idx" ON "auction_bids"("auctionId", "lotId", "supplierId");

-- CreateIndex
CREATE INDEX "auction_extensions_auctionId_idx" ON "auction_extensions"("auctionId");

-- CreateIndex
CREATE INDEX "auction_extensions_orgId_idx" ON "auction_extensions"("orgId");

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_rfxEventId_fkey" FOREIGN KEY ("rfxEventId") REFERENCES "rfx_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_lots" ADD CONSTRAINT "auction_lots_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_line_items" ADD CONSTRAINT "auction_line_items_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "auction_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_invitations" ADD CONSTRAINT "auction_invitations_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "auction_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "auction_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_extensions" ADD CONSTRAINT "auction_extensions_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
