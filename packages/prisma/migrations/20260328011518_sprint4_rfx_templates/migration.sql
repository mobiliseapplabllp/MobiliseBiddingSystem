-- CreateTable
CREATE TABLE "rfx_templates" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lotsJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfx_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rfx_templates_orgId_idx" ON "rfx_templates"("orgId");

-- CreateIndex
CREATE INDEX "rfx_templates_type_idx" ON "rfx_templates"("type");
