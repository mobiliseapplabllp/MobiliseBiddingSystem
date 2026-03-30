-- CreateTable
CREATE TABLE "supplier_invitations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierEmail" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_submissions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "lotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalPrice" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_line_items" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "rfxLineItemId" TEXT,
    "orgId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "uom" TEXT,
    "unitPrice" DECIMAL(65,30),
    "totalPrice" DECIMAL(65,30),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_documents" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invitations_token_key" ON "supplier_invitations"("token");

-- CreateIndex
CREATE INDEX "supplier_invitations_eventId_idx" ON "supplier_invitations"("eventId");

-- CreateIndex
CREATE INDEX "supplier_invitations_orgId_idx" ON "supplier_invitations"("orgId");

-- CreateIndex
CREATE INDEX "supplier_invitations_supplierId_idx" ON "supplier_invitations"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_invitations_token_idx" ON "supplier_invitations"("token");

-- CreateIndex
CREATE INDEX "bid_submissions_eventId_idx" ON "bid_submissions"("eventId");

-- CreateIndex
CREATE INDEX "bid_submissions_orgId_idx" ON "bid_submissions"("orgId");

-- CreateIndex
CREATE INDEX "bid_submissions_supplierId_idx" ON "bid_submissions"("supplierId");

-- CreateIndex
CREATE INDEX "bid_submissions_invitationId_idx" ON "bid_submissions"("invitationId");

-- CreateIndex
CREATE INDEX "bid_submissions_status_idx" ON "bid_submissions"("status");

-- CreateIndex
CREATE INDEX "bid_line_items_bidId_idx" ON "bid_line_items"("bidId");

-- CreateIndex
CREATE INDEX "bid_line_items_orgId_idx" ON "bid_line_items"("orgId");

-- CreateIndex
CREATE INDEX "bid_documents_bidId_idx" ON "bid_documents"("bidId");

-- CreateIndex
CREATE INDEX "bid_documents_orgId_idx" ON "bid_documents"("orgId");

-- AddForeignKey
ALTER TABLE "supplier_invitations" ADD CONSTRAINT "supplier_invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "rfx_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "rfx_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "supplier_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "rfx_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_line_items" ADD CONSTRAINT "bid_line_items_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_documents" ADD CONSTRAINT "bid_documents_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bid_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
