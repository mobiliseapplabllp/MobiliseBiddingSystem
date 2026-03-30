-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "rfxEventId" TEXT,
    "awardId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contractType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "totalValue" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "signedDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "incoterms" TEXT,
    "terms" JSONB,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "changeType" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_orgId_idx" ON "contracts"("orgId");

-- CreateIndex
CREATE INDEX "contracts_buId_idx" ON "contracts"("buId");

-- CreateIndex
CREATE INDEX "contracts_rfxEventId_idx" ON "contracts"("rfxEventId");

-- CreateIndex
CREATE INDEX "contracts_awardId_idx" ON "contracts"("awardId");

-- CreateIndex
CREATE INDEX "contracts_supplierId_idx" ON "contracts"("supplierId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_endDate_idx" ON "contracts"("endDate");

-- CreateIndex
CREATE INDEX "contracts_createdAt_idx" ON "contracts"("createdAt");

-- CreateIndex
CREATE INDEX "contract_amendments_contractId_idx" ON "contract_amendments"("contractId");

-- CreateIndex
CREATE INDEX "contract_amendments_orgId_idx" ON "contract_amendments"("orgId");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rfxEventId_fkey" FOREIGN KEY ("rfxEventId") REFERENCES "rfx_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
