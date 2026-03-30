-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "rfxEventId" TEXT NOT NULL,
    "evaluationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "awardMode" TEXT NOT NULL DEFAULT 'WHOLE_EVENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalValue" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_items" (
    "id" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lotId" TEXT,
    "bidId" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "awardedValue" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'AWARDED',
    "rejectionReason" TEXT,
    "conditions" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "award_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award_approvals" (
    "id" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "award_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "awards_orgId_idx" ON "awards"("orgId");

-- CreateIndex
CREATE INDEX "awards_buId_idx" ON "awards"("buId");

-- CreateIndex
CREATE INDEX "awards_rfxEventId_idx" ON "awards"("rfxEventId");

-- CreateIndex
CREATE INDEX "awards_evaluationId_idx" ON "awards"("evaluationId");

-- CreateIndex
CREATE INDEX "awards_status_idx" ON "awards"("status");

-- CreateIndex
CREATE INDEX "awards_createdAt_idx" ON "awards"("createdAt");

-- CreateIndex
CREATE INDEX "award_items_awardId_idx" ON "award_items"("awardId");

-- CreateIndex
CREATE INDEX "award_items_orgId_idx" ON "award_items"("orgId");

-- CreateIndex
CREATE INDEX "award_items_supplierId_idx" ON "award_items"("supplierId");

-- CreateIndex
CREATE INDEX "award_approvals_awardId_idx" ON "award_approvals"("awardId");

-- CreateIndex
CREATE INDEX "award_approvals_orgId_idx" ON "award_approvals"("orgId");

-- CreateIndex
CREATE INDEX "award_approvals_approverId_idx" ON "award_approvals"("approverId");

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_rfxEventId_fkey" FOREIGN KEY ("rfxEventId") REFERENCES "rfx_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_items" ADD CONSTRAINT "award_items_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award_approvals" ADD CONSTRAINT "award_approvals_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
