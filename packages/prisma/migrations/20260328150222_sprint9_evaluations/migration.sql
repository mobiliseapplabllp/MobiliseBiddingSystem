-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "buId" TEXT,
    "rfxEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "envelopeType" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "technicalWeight" DECIMAL(5,2),
    "commercialWeight" DECIMAL(5,2),
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria_items" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "envelope" TEXT NOT NULL DEFAULT 'TECHNICAL',
    "weight" DECIMAL(5,2) NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_criteria_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluator_assignments" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "envelope" TEXT NOT NULL DEFAULT 'TECHNICAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evaluator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_scores" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "comments" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluations_orgId_idx" ON "evaluations"("orgId");

-- CreateIndex
CREATE INDEX "evaluations_rfxEventId_idx" ON "evaluations"("rfxEventId");

-- CreateIndex
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");

-- CreateIndex
CREATE INDEX "evaluation_criteria_items_evaluationId_idx" ON "evaluation_criteria_items"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_criteria_items_orgId_idx" ON "evaluation_criteria_items"("orgId");

-- CreateIndex
CREATE INDEX "evaluator_assignments_evaluationId_idx" ON "evaluator_assignments"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluator_assignments_orgId_idx" ON "evaluator_assignments"("orgId");

-- CreateIndex
CREATE INDEX "evaluator_assignments_evaluatorId_idx" ON "evaluator_assignments"("evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_assignments_evaluationId_evaluatorId_envelope_key" ON "evaluator_assignments"("evaluationId", "evaluatorId", "envelope");

-- CreateIndex
CREATE INDEX "evaluation_scores_evaluationId_idx" ON "evaluation_scores"("evaluationId");

-- CreateIndex
CREATE INDEX "evaluation_scores_criterionId_idx" ON "evaluation_scores"("criterionId");

-- CreateIndex
CREATE INDEX "evaluation_scores_evaluatorId_idx" ON "evaluation_scores"("evaluatorId");

-- CreateIndex
CREATE INDEX "evaluation_scores_orgId_idx" ON "evaluation_scores"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluationId_criterionId_evaluatorId_bidI_key" ON "evaluation_scores"("evaluationId", "criterionId", "evaluatorId", "bidId");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rfxEventId_fkey" FOREIGN KEY ("rfxEventId") REFERENCES "rfx_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria_items" ADD CONSTRAINT "evaluation_criteria_items_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "evaluation_criteria_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations FORCE ROW LEVEL SECURITY;
CREATE POLICY evaluations_tenant_isolation ON evaluations
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

ALTER TABLE evaluation_criteria_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria_items FORCE ROW LEVEL SECURITY;
CREATE POLICY evaluation_criteria_items_tenant_isolation ON evaluation_criteria_items
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

ALTER TABLE evaluator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY evaluator_assignments_tenant_isolation ON evaluator_assignments
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());

ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY evaluation_scores_tenant_isolation ON evaluation_scores
  FOR ALL USING (current_org_id() = '' OR "orgId" = current_org_id());
