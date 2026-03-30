-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_interactions_orgId_idx" ON "ai_interactions"("orgId");

-- CreateIndex
CREATE INDEX "ai_interactions_userId_idx" ON "ai_interactions"("userId");

-- CreateIndex
CREATE INDEX "ai_interactions_feature_idx" ON "ai_interactions"("feature");

-- CreateIndex
CREATE INDEX "ai_interactions_createdAt_idx" ON "ai_interactions"("createdAt");
