-- CreateTable
CREATE TABLE "supplier_profiles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "companySize" TEXT NOT NULL DEFAULT 'SMALL',
    "yearEstablished" INTEGER,
    "annualRevenue" DECIMAL(65,30),
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "primaryContact" JSONB,
    "addresses" JSONB,
    "bankDetails" JSONB,
    "spendCategories" TEXT[],
    "certifications" JSONB,
    "diversityFlags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_qualifications" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "qualificationType" TEXT NOT NULL DEFAULT 'PREQUALIFICATION',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "score" DECIMAL(5,2),
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "expiresAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "disqualifiedReason" TEXT,
    "responses" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_scorecards" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "qualityScore" DECIMAL(5,2) NOT NULL,
    "deliveryScore" DECIMAL(5,2) NOT NULL,
    "priceScore" DECIMAL(5,2) NOT NULL,
    "complianceScore" DECIMAL(5,2) NOT NULL,
    "comments" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_profiles_orgId_key" ON "supplier_profiles"("orgId");

-- CreateIndex
CREATE INDEX "supplier_profiles_orgId_idx" ON "supplier_profiles"("orgId");

-- CreateIndex
CREATE INDEX "supplier_profiles_status_idx" ON "supplier_profiles"("status");

-- CreateIndex
CREATE INDEX "supplier_profiles_createdAt_idx" ON "supplier_profiles"("createdAt");

-- CreateIndex
CREATE INDEX "supplier_documents_supplierProfileId_idx" ON "supplier_documents"("supplierProfileId");

-- CreateIndex
CREATE INDEX "supplier_documents_orgId_idx" ON "supplier_documents"("orgId");

-- CreateIndex
CREATE INDEX "supplier_documents_status_idx" ON "supplier_documents"("status");

-- CreateIndex
CREATE INDEX "supplier_documents_createdAt_idx" ON "supplier_documents"("createdAt");

-- CreateIndex
CREATE INDEX "supplier_qualifications_orgId_idx" ON "supplier_qualifications"("orgId");

-- CreateIndex
CREATE INDEX "supplier_qualifications_supplierId_idx" ON "supplier_qualifications"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_qualifications_status_idx" ON "supplier_qualifications"("status");

-- CreateIndex
CREATE INDEX "supplier_qualifications_createdAt_idx" ON "supplier_qualifications"("createdAt");

-- CreateIndex
CREATE INDEX "supplier_scorecards_orgId_idx" ON "supplier_scorecards"("orgId");

-- CreateIndex
CREATE INDEX "supplier_scorecards_supplierId_idx" ON "supplier_scorecards"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_scorecards_period_idx" ON "supplier_scorecards"("period");

-- CreateIndex
CREATE INDEX "supplier_scorecards_createdAt_idx" ON "supplier_scorecards"("createdAt");

-- AddForeignKey
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplierProfileId_fkey" FOREIGN KEY ("supplierProfileId") REFERENCES "supplier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
