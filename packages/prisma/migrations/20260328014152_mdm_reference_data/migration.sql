-- CreateTable
CREATE TABLE "reference_data" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orgId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reference_data_type_orgId_isActive_idx" ON "reference_data"("type", "orgId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "reference_data_type_code_orgId_key" ON "reference_data"("type", "code", "orgId");
