-- Sprint 16: Analytics Dashboards
CREATE TABLE "analytics_dashboards" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_dashboards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_dashboards_orgId_idx" ON "analytics_dashboards"("orgId");
CREATE INDEX "analytics_dashboards_type_idx" ON "analytics_dashboards"("type");
CREATE INDEX "analytics_dashboards_createdAt_idx" ON "analytics_dashboards"("createdAt");

-- Sprint 17: Reports
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "parameters" JSONB,
    "generatedData" JSONB,
    "format" TEXT NOT NULL DEFAULT 'JSON',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduleConfig" JSONB,
    "createdById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_orgId_idx" ON "reports"("orgId");
CREATE INDEX "reports_reportType_idx" ON "reports"("reportType");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- Sprint 18: Notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "emailSentAt" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_orgId_idx" ON "notifications"("orgId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");
CREATE INDEX "notifications_reminderAt_idx" ON "notifications"("reminderAt");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- Sprint 18: Notification Preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_userId_type_key" ON "notification_preferences"("userId", "type");

-- ═══════════════════════════════════════════════════════
-- RLS Policies for tenant-scoped tables
-- ═══════════════════════════════════════════════════════

-- Analytics Dashboards
ALTER TABLE "analytics_dashboards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_dashboards" FORCE ROW LEVEL SECURITY;
CREATE POLICY analytics_dashboards_tenant_isolation ON "analytics_dashboards"
  FOR ALL
  USING (current_setting('app.current_org_id', true) = '' OR "orgId" = current_setting('app.current_org_id', true));

-- Reports
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;
CREATE POLICY reports_tenant_isolation ON "reports"
  FOR ALL
  USING (current_setting('app.current_org_id', true) = '' OR "orgId" = current_setting('app.current_org_id', true));

-- Notifications (orgId is optional, so also allow NULL orgId)
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant_isolation ON "notifications"
  FOR ALL
  USING (
    current_setting('app.current_org_id', true) = ''
    OR "orgId" IS NULL
    OR "orgId" = current_setting('app.current_org_id', true)
  );

-- Notification Preferences (user-scoped, no orgId — no tenant RLS needed, but enable RLS for safety)
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_access ON "notification_preferences"
  FOR ALL
  USING (true);
