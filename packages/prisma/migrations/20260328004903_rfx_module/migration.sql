-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "ssoConfig" JSONB,
ADD COLUMN     "supplierType" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rfx_events" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "refNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "submissionDeadline" TIMESTAMP(3),
    "clarificationDeadline" TIMESTAMP(3),
    "openingDate" TIMESTAMP(3),
    "estimatedValue" DECIMAL(65,30),
    "internalRef" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfx_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfx_lots" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "lotNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT,
    "estimatedValue" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfx_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfx_line_items" (
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

    CONSTRAINT "rfx_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rfx_events_orgId_idx" ON "rfx_events"("orgId");

-- CreateIndex
CREATE INDEX "rfx_events_buId_idx" ON "rfx_events"("buId");

-- CreateIndex
CREATE INDEX "rfx_events_status_idx" ON "rfx_events"("status");

-- CreateIndex
CREATE INDEX "rfx_events_createdAt_idx" ON "rfx_events"("createdAt");

-- CreateIndex
CREATE INDEX "rfx_lots_eventId_idx" ON "rfx_lots"("eventId");

-- CreateIndex
CREATE INDEX "rfx_lots_orgId_idx" ON "rfx_lots"("orgId");

-- CreateIndex
CREATE INDEX "rfx_line_items_lotId_idx" ON "rfx_line_items"("lotId");

-- CreateIndex
CREATE INDEX "rfx_line_items_orgId_idx" ON "rfx_line_items"("orgId");

-- AddForeignKey
ALTER TABLE "rfx_lots" ADD CONSTRAINT "rfx_lots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "rfx_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfx_line_items" ADD CONSTRAINT "rfx_line_items_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "rfx_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
