-- Sprint 25: Scale & Reliability — Health Checks
-- HealthCheck table does NOT have orgId — it is platform-level, no RLS needed.

CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "health_checks_service_idx" ON "health_checks"("service");
CREATE INDEX "health_checks_checkedAt_idx" ON "health_checks"("checkedAt");

-- Auto-cleanup: remove health checks older than 30 days (run via cron or manual SQL)
-- This is a comment for ops reference — not an automated policy.
-- DELETE FROM health_checks WHERE "checkedAt" < NOW() - INTERVAL '30 days';
