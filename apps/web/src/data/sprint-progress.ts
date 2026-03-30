// ═══════════════════════════════════════════════════════
// Sprint Progress Data
// Update this file at the end of each sprint to reflect progress.
// ═══════════════════════════════════════════════════════

export type SprintStatus = 'completed' | 'in-progress' | 'planned';

export interface SprintFeature {
  name: string;
  completed: boolean;
}

export interface Sprint {
  id: number;
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  completionPercent: number;
  features: SprintFeature[];
}

export interface FeatureArea {
  name: string;
  color: string;
  sprintRange: string;
  progressPercent: number;
}

// ── Project start: 2026-03-16 (2-week sprints, 26 total) ──

export const PROJECT_START = '2026-03-16';
export const PROJECT_END = '2027-03-15';
export const TOTAL_SPRINTS = 27;
export const TOTAL_MONTHS = 12;

export const sprints: Sprint[] = [
  {
    id: 1,
    name: 'Foundation — Multi-Tenancy & Auth',
    status: 'completed',
    startDate: '2026-03-16',
    endDate: '2026-03-29',
    completionPercent: 100,
    features: [
      { name: 'Turborepo monorepo scaffold', completed: true },
      { name: 'Prisma schema — organisations, business units', completed: true },
      { name: 'Prisma schema — users, sessions, RBAC', completed: true },
      { name: 'NestJS API — auth module (JWT + refresh)', completed: true },
      { name: 'NestJS API — org & BU CRUD', completed: true },
      { name: 'Next.js — login page', completed: true },
      { name: 'Next.js — authenticated layout + sidebar', completed: true },
      { name: 'Next.js — dashboard with KPI cards', completed: true },
      { name: 'Next.js — admin pages (orgs, BUs, users)', completed: true },
      { name: 'Design system tokens + Tailwind setup', completed: true },
      { name: 'Docker Compose dev environment', completed: true },
      { name: 'Shared enums & DTOs package', completed: true },
      { name: 'Breadcrumbs navigation component', completed: true },
      { name: 'RLS tenant isolation policies (database)', completed: true },
    ],
  },
  {
    id: 2,
    name: 'RFx Module — Core Events',
    status: 'completed',
    startDate: '2026-03-30',
    endDate: '2026-04-12',
    completionPercent: 100,
    features: [
      // ── Pre-Sprint-2 hardening ──
      { name: 'i18n scaffold (next-intl, English locale)', completed: true },
      { name: 'Next.js server-side auth middleware', completed: true },
      { name: 'Audit log table + AuditService', completed: true },
      { name: 'Analytics events table + AnalyticsService', completed: true },
      { name: 'Domain event emitter (@nestjs/event-emitter)', completed: true },
      { name: 'Fix RolesGuard to use RolePermission table', completed: true },
      { name: 'Tailwind logical properties (RTL readiness)', completed: true },
      { name: 'Organisation ssoConfig + supplierType fields', completed: true },
      // ── Sprint 2 core features ──
      { name: 'Prisma schema — RFx events, lots, line items', completed: true },
      { name: 'API — event CRUD endpoints', completed: true },
      { name: 'API — lot & line item management', completed: true },
      { name: 'Web — event creation wizard', completed: true },
      { name: 'Web — event list with filters & search', completed: true },
      { name: 'Web — event detail view', completed: true },
      { name: 'Dev Progress tracking page', completed: true },
    ],
  },
  {
    id: 3,
    name: 'RFx Module — Supplier Responses',
    status: 'completed',
    startDate: '2026-04-13',
    endDate: '2026-04-26',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — SupplierInvitation, BidSubmission, BidLineItem, BidDocument', completed: true },
      { name: 'API — invitations module (invite, respond, revoke)', completed: true },
      { name: 'API — bids module (create draft, submit, amend, withdraw)', completed: true },
      { name: 'Transactional email provider setup (Resend + domain event listener)', completed: true },
      { name: 'Supplier portal layout + invitation landing page', completed: true },
      { name: 'Bid submission form (line items, lot selector, draft/submit)', completed: true },
      { name: 'Buyer — invitation management UI (send, copy link, revoke)', completed: true },
      { name: 'Buyer — bid submissions view (ranked by price, expandable)', completed: true },
    ],
  },
  {
    id: 4,
    name: 'RFx Module — Templates & Publishing',
    status: 'completed',
    startDate: '2026-04-27',
    endDate: '2026-05-10',
    completionPercent: 100,
    features: [
      { name: 'RFx templates system (schema, API, templates page, use-template modal)', completed: true },
      { name: 'Event publishing workflow with pre-publish validation checklist modal', completed: true },
      { name: 'User onboarding wizard (first-login, 4-step, localStorage dismiss)', completed: true },
      { name: 'Deadline management — dashboard widget + /deadlines page + API endpoint', completed: true },
    ],
  },
  {
    // Hardening sprint — unplanned work identified between S4 and S5
    id: 5,
    name: 'Hardening — MDM, Org/BU CRUD, Seed Data',
    status: 'completed',
    startDate: '2026-05-11',
    endDate: '2026-05-17',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — ReferenceData generic MDM table', completed: true },
      { name: 'Seed — ISO 4217 currencies (40), ISO 3166 countries (65), IANA timezones (38)', completed: true },
      { name: 'Seed — languages (20), UOMs (32), payment terms (12), Incoterms 2020 (11)', completed: true },
      { name: 'Seed — spend categories (24), document types (15), contract types (10)', completed: true },
      { name: 'Seed — award criteria (6), rejection reasons (10), evaluation criteria (10)', completed: true },
      { name: 'API — MasterDataModule: GET /master-data?type=X, POST, PATCH, DELETE (soft)', completed: true },
      { name: 'API — Org PATCH + DELETE (soft) endpoints', completed: true },
      { name: 'API — BU PATCH + DELETE (soft) endpoints', completed: true },
      { name: 'Web — /admin/master-data config-driven UI (sidebar tabs per type)', completed: true },
      { name: 'Web — Organisations page: Edit/Delete modals + MDM currency select', completed: true },
      { name: 'Web — Business Units page: Edit/Delete modals + MDM currency select', completed: true },
      { name: 'Web — Event creation: currency select + UOM datalist wired to MDM', completed: true },
      { name: 'CLAUDE.md ADR-009 — MDM pattern documented for future sprints', completed: true },
    ],
  },
  {
    id: 6,
    name: 'Auctions — Reverse Auction Engine',
    status: 'completed',
    startDate: '2026-05-18',
    endDate: '2026-05-31',
    completionPercent: 100,
    features: [
      { name: 'Redis module (ioredis) — global service with TTL cache, graceful fallback', completed: true },
      { name: 'PgBouncer scaffold in docker-compose (connection pooling)', completed: true },
      { name: 'SSO (SAML/OIDC) per-org config DTO + PATCH endpoint scaffold', completed: true },
      { name: 'Prisma schema — 6 models (Auction, AuctionLot, AuctionLineItem, AuctionInvitation, AuctionBid, AuctionExtension)', completed: true },
      { name: 'RLS policies for all 6 auction tables + 10 missing from Sprints 2-5', completed: true },
      { name: 'Auction CRUD API — create with nested lots/line items, list, detail, update, soft-delete', completed: true },
      { name: 'Auction state machine — DRAFT→PUBLISHED→OPEN→CLOSED→EVALUATED→AWARDED with validation', completed: true },
      { name: 'Bid engine — placeBid with all CLAUDE.md rules (improve, decrement, reserve, timing)', completed: true },
      { name: 'Auto-extension — extends auction when bid placed in last N minutes', completed: true },
      { name: 'Ranking algorithm — best-per-supplier, sorted ascending', completed: true },
      { name: 'Auction scheduler — @Cron auto-open and auto-close on schedule', completed: true },
      { name: 'Domain events — 7 auction event classes + emitters in all services', completed: true },
      { name: 'Live state endpoint — GET /auctions/:id/live with Redis 2s cache', completed: true },
      { name: 'Web — auctions list page with KPIs, search, filters, pagination', completed: true },
      { name: 'Web — create auction 3-step wizard (details, lots, review)', completed: true },
      { name: 'Web — auction detail/live view with countdown timer, ranking, bid history', completed: true },
      { name: 'Web — countdown timer component (HH:MM:SS, color transitions, pulse, EXTENDED badge)', completed: true },
      { name: 'Seed data — 3 demo auctions (DRAFT, OPEN with 4 bids, CLOSED) + supplier org', completed: true },
      { name: 'Security hardening — rate limiting, JWT mandatory, tenant middleware, SHA256 auto-migrate', completed: true },
      { name: 'RBAC — DB-driven permissions, role management UI, permission matrix modal', completed: true },
      { name: 'Org/User switcher in topbar with USER_IMPERSONATE permission', completed: true },
      { name: 'Seed users — 7 personas (Admin, OrgAdmin, EventMgr, Buyer, Evaluator, Observer, Supplier)', completed: true },
    ],
  },
  {
    id: 7,
    name: 'Auctions — Live Bidding UI',
    status: 'completed',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    completionPercent: 100,
    features: [
      { name: 'WebSocket gateway (@nestjs/websockets + socket.io) with auction rooms', completed: true },
      { name: 'Real-time bid broadcast — domain events → WebSocket → all viewers', completed: true },
      { name: 'Frontend useAuctionSocket hook (join/leave rooms, receive events)', completed: true },
      { name: 'Live bid ticker component (animated, newest-first, rank badges)', completed: true },
      { name: 'Bid history area chart (recharts — price over time with gradient)', completed: true },
      { name: 'Auction opened/closed/extended broadcast to rooms', completed: true },
      { name: 'Proxy/auto bidding — Prisma model, API CRUD, auto-trigger after each bid', completed: true },
      { name: 'Proxy bid trigger chain — outbid → auto-decrement → re-bid → cascade', completed: true },
    ],
  },
  {
    id: 8,
    name: 'Auctions — Rules & Extensions',
    status: 'completed',
    startDate: '2026-06-15',
    endDate: '2026-06-28',
    completionPercent: 100,
    features: [
      { name: 'Auto-extension rules — already in Sprint 6 engine (extensionMinutes, triggerMinutes, maxExtensions)', completed: true },
      { name: 'Japanese auction variant service (round-based, elimination, price acceptance)', completed: true },
      { name: 'Dutch auction variant service (time-based price drop, first-accept-wins)', completed: true },
      { name: 'Variant state API endpoint — GET /auctions/:id/variant-state', completed: true },
      { name: 'Auction result export service — structured JSON + CSV generator', completed: true },
      { name: 'Export API endpoints — GET /auctions/:id/export (JSON) + /export/csv', completed: true },
    ],
  },
  {
    id: 9,
    name: 'Evaluations — Scoring Framework',
    status: 'completed',
    startDate: '2026-06-29',
    endDate: '2026-07-12',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — 4 models (Evaluation, Criterion, Assignment, Score) + RLS', completed: true },
      { name: 'Evaluation CRUD API — create with nested criteria, list, detail, update, soft-delete', completed: true },
      { name: 'Multi-envelope evaluation (SINGLE/DOUBLE/THREE) with weight validation', completed: true },
      { name: 'Evaluator assignment & access control (per-envelope, prevents duplicates)', completed: true },
      { name: 'Score submission with upsert (re-score support), maxScore validation', completed: true },
      { name: 'Weighted score summary — per-bid ranking with envelope breakdown', completed: true },
      { name: 'State machine — DRAFT → IN_PROGRESS → COMPLETED (validates criteria+assignments before start)', completed: true },
      { name: 'Domain events — EvaluationCreated, Started, Completed, ScoreSubmitted', completed: true },
    ],
  },
  {
    id: 10,
    name: 'Evaluations — Consensus & Reports',
    status: 'completed',
    startDate: '2026-07-13',
    endDate: '2026-07-26',
    completionPercent: 100,
    features: [
      { name: 'Score comparison matrix — per-bid, per-criterion, per-evaluator with averages + variance', completed: true },
      { name: 'Consensus scoring — owner-only, isConsensus flag, overrides individual scores', completed: true },
      { name: 'Shortlisting — by topN score ranking or explicit bidIds, marks BidSubmission.shortlisted', completed: true },
      { name: 'Evaluation report export — structured JSON + CSV with criteria, scores, ranking, shortlist', completed: true },
      { name: 'Domain events — ConsensusScoreSubmitted, BidsShortlisted', completed: true },
      { name: 'Evaluations list page — frontend with KPIs, search, status filter', completed: true },
    ],
  },
  {
    id: 11,
    name: 'Awards — Decision & Approval',
    status: 'completed',
    startDate: '2026-07-27',
    endDate: '2026-08-09',
    completionPercent: 100,
    features: [
      { name: 'Award recommendation engine (use AWARD_CRITERIA from MDM)', completed: true },
      { name: 'Split & conditional awards', completed: true },
      { name: 'Prisma schema — Award, AwardItem, AwardApproval + RLS', completed: true },
      { name: 'Award CRUD API — create with items, list, detail, update, soft-delete', completed: true },
      { name: 'Multi-level approval workflow — sequential levels, auto-approve when all pass', completed: true },
      { name: 'Submit for approval → approve/reject per level → notify suppliers', completed: true },
      { name: 'IApprovalWorkflow interface (seam for Sprint 20 engine)', completed: true },
      { name: 'Domain events — Created, SubmittedForApproval, Approved, Rejected, NotifiedSuppliers', completed: true },
      { name: 'Award modes — WHOLE_EVENT, LOT_LEVEL, LINE_LEVEL, SPLIT, CONDITIONAL', completed: true },
    ],
  },
  {
    id: 12,
    name: 'Contracts — Generation & Management',
    status: 'completed',
    startDate: '2026-08-10',
    endDate: '2026-08-23',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — Contract + ContractAmendment models + RLS', completed: true },
      { name: 'Contract CRUD API — create with auto-number, list, detail, update', completed: true },
      { name: 'Contract lifecycle — DRAFT→UNDER_REVIEW→ACTIVE→SUSPENDED/EXPIRED/TERMINATED→RENEWED', completed: true },
      { name: 'Amendment management — add/list amendments with change tracking', completed: true },
      { name: 'Expiring contracts endpoint — GET /contracts/expiring?days=30', completed: true },
      { name: 'Contract stats — total, by status, by type, expiring count', completed: true },
      { name: 'MDM integration — contractType, paymentTerms, incoterms from reference data', completed: true },
      { name: 'Domain events — Created, Activated, Expired, Amended', completed: true },
    ],
  },
  {
    id: 13,
    name: 'Supplier Portal — Registration',
    status: 'completed',
    startDate: '2026-08-24',
    endDate: '2026-09-06',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — SupplierProfile + SupplierDocument models + RLS', completed: true },
      { name: 'Supplier self-registration API (create profile, submit for review)', completed: true },
      { name: 'Company profile management (get, update, review/approve/suspend)', completed: true },
      { name: 'Document upload metadata + verification workflow (PENDING/VERIFIED/REJECTED)', completed: true },
      { name: 'Category selection via spendCategories (MDM SPEND_CATEGORY)', completed: true },
      { name: 'Domain events — SupplierRegistered, SupplierApproved, SupplierSuspended', completed: true },
      { name: 'RBAC — SUPPLIER_VIEW + SUPPLIER_MANAGE permissions seeded', completed: true },
    ],
  },
  {
    id: 14,
    name: 'Supplier Portal — Qualification',
    status: 'completed',
    startDate: '2026-09-07',
    endDate: '2026-09-20',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — SupplierQualification model + RLS', completed: true },
      { name: 'Qualification CRUD API (create, score, list with filters)', completed: true },
      { name: 'Qualification types — PREQUALIFICATION, DUE_DILIGENCE, ANNUAL_REVIEW', completed: true },
      { name: 'Qualification scoring — 0-100 score, QUALIFIED/DISQUALIFIED status', completed: true },
      { name: 'Questionnaire responses stored as JSON', completed: true },
      { name: 'Approved supplier list endpoint (GET /suppliers/approved)', completed: true },
      { name: 'Supplier search with category and status filters', completed: true },
      { name: 'Domain event — SupplierQualified', completed: true },
    ],
  },
  {
    id: 15,
    name: 'Supplier Portal — Performance',
    status: 'completed',
    startDate: '2026-09-21',
    endDate: '2026-10-04',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — SupplierScorecard model + RLS', completed: true },
      { name: 'Performance scorecard API (create, list, trend)', completed: true },
      { name: 'Multi-dimension scoring — quality, delivery, price, compliance + overall', completed: true },
      { name: 'Supplier risk level indicators (LOW/MEDIUM/HIGH/CRITICAL)', completed: true },
      { name: 'Performance trend endpoint (GET /scorecards/trend/:supplierId)', completed: true },
      { name: 'Diversity tracking via diversityFlags JSON on SupplierProfile', completed: true },
      { name: 'Domain event — ScorecardCreated', completed: true },
    ],
  },
  {
    id: 16,
    name: 'Analytics — Dashboards & KPIs',
    status: 'completed',
    startDate: '2026-10-05',
    endDate: '2026-10-18',
    completionPercent: 100,
    features: [
      { name: 'Spend analytics dashboard with category breakdown and trend charts', completed: true },
      { name: 'Savings report — target vs actual savings per event with totals', completed: true },
      { name: 'Event activity analytics — created, published, awarded counts over time', completed: true },
      { name: 'Auction performance metrics — participation rate, avg bids, price reduction %', completed: true },
      { name: 'Supplier metrics — response rates, win rates, avg scoring by supplier', completed: true },
      { name: 'Dashboard widgets — configurable KPI cards with sparkline charts (recharts)', completed: true },
      { name: 'Analytics CRUD API — saved dashboards, widget layout persistence', completed: true },
    ],
  },
  {
    id: 17,
    name: 'Analytics — Reporting Engine',
    status: 'completed',
    startDate: '2026-10-19',
    endDate: '2026-11-01',
    completionPercent: 100,
    features: [
      { name: '7 report types — spend summary, savings, event status, supplier performance, auction results, evaluation summary, contract status', completed: true },
      { name: 'CSV export for all report types with column selection', completed: true },
      { name: 'Scheduled reports — cron-based delivery via email (daily/weekly/monthly)', completed: true },
      { name: 'Report CRUD API — create, list, update, soft-delete saved reports', completed: true },
    ],
  },
  {
    id: 18,
    name: 'Notifications — Email & In-App',
    status: 'completed',
    startDate: '2026-11-02',
    endDate: '2026-11-15',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — Notification model (in-app + email channels) + RLS', completed: true },
      { name: '14 domain event listeners — RFx published, bid submitted, auction opened/closed, award approved, contract activated, etc.', completed: true },
      { name: 'User notification preferences API — per-event-type channel toggles (in-app, email)', completed: true },
      { name: 'In-app notification center — bell icon, unread badge, mark-as-read, paginated list', completed: true },
      { name: 'Email notification channel — Resend templates for each event type', completed: true },
    ],
  },
  {
    id: 19,
    name: 'Notifications — Reminders & Escalations',
    status: 'completed',
    startDate: '2026-11-16',
    endDate: '2026-11-29',
    completionPercent: 100,
    features: [
      { name: 'Deadline reminders — @Cron checks at 24h, 48h, 7d before event/bid deadlines', completed: true },
      { name: 'Contract expiration reminders — @Cron checks at 30d, 60d, 90d before expiry', completed: true },
      { name: 'Scheduled reminder service — configurable intervals, deduplication, tenant-scoped', completed: true },
      { name: 'Domain events — DeadlineReminderSent, ContractExpirationWarning', completed: true },
    ],
  },
  {
    id: 20,
    name: 'Advanced — Multi-Currency & Localization',
    status: 'completed',
    startDate: '2026-11-30',
    endDate: '2026-12-13',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — ExchangeRate model + RLS', completed: true },
      { name: 'Multi-currency bid normalization API', completed: true },
      { name: 'Exchange rate CRUD + scheduled rate fetching', completed: true },
      { name: 'CurrencyModule — convert, normalize, rate management endpoints', completed: true },
      { name: 'Add translation locales (AR, FR) to existing i18n scaffold', completed: true },
      { name: 'RTL layout support — Tailwind logical properties verified', completed: true },
    ],
  },
  {
    id: 21,
    name: 'Advanced — Workflow Engine',
    status: 'completed',
    startDate: '2026-12-14',
    endDate: '2026-12-27',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — WorkflowTemplate + WorkflowInstance models + RLS', completed: true },
      { name: 'WorkflowsModule — template CRUD, instance execution, step progression', completed: true },
      { name: 'Configurable approval workflows — sequential levels with timeout', completed: true },
      { name: 'Delegation & substitution — auto-delegate on timeout', completed: true },
      { name: 'SLA tracking — overdue step detection + notifications', completed: true },
      { name: 'Domain events — WorkflowStarted, StepApproved, StepRejected, WorkflowCompleted', completed: true },
    ],
  },
  {
    id: 22,
    name: 'Advanced — Audit & Compliance',
    status: 'completed',
    startDate: '2026-12-28',
    endDate: '2027-01-10',
    completionPercent: 100,
    features: [
      { name: 'AuditModule — searchable audit log API with filters, pagination, export', completed: true },
      { name: 'Audit trail UI — /admin/audit-log with entity-type filter, date range, user filter', completed: true },
      { name: 'Compliance reporting — data access log, permission change log', completed: true },
      { name: 'Data retention policies — configurable per-org retention years, auto-archive', completed: true },
      { name: 'GDPR data export/deletion — user data export endpoint, right-to-be-forgotten workflow', completed: true },
    ],
  },
  {
    id: 23,
    name: 'Advanced — API & Integrations',
    status: 'completed',
    startDate: '2027-01-11',
    endDate: '2027-01-24',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — ApiKey + Webhook models + RLS', completed: true },
      { name: 'IntegrationsModule — API key CRUD (create, rotate, revoke, list)', completed: true },
      { name: 'Public REST API — API key auth guard, scope-based access control', completed: true },
      { name: 'Webhook system — event dispatch, retry with exponential backoff, HMAC signing', completed: true },
      { name: 'ERP integration adapters — generic adapter interface for SAP/Oracle', completed: true },
      { name: 'SSO (SAML / OIDC) integration — org-level SSO config, SAML callback handler', completed: true },
    ],
  },
  {
    id: 24,
    name: 'Performance — Optimization & Caching',
    status: 'completed',
    startDate: '2027-01-25',
    endDate: '2027-02-07',
    completionPercent: 100,
    features: [
      { name: 'PerformanceModule — cache stats, cache warming, database stats, latency metrics API', completed: true },
      { name: 'Enhanced LoggingInterceptor — per-endpoint latency tracking in Redis (p50/p95/p99)', completed: true },
      { name: 'URL normalization for latency grouping (UUID stripping, query param removal)', completed: true },
      { name: 'Cache warming service — pre-populate Redis for RFx, auctions, contracts, master data', completed: true },
      { name: 'Slow query detection — endpoints exceeding 200ms average response time', completed: true },
      { name: 'Database stats — table sizes, row estimates, index usage from pg_stat_user_tables', completed: true },
    ],
  },
  {
    id: 25,
    name: 'Performance — Scale & Reliability',
    status: 'completed',
    startDate: '2027-02-08',
    endDate: '2027-02-21',
    completionPercent: 100,
    features: [
      { name: 'Prisma schema — HealthCheck model (service, status, responseMs, details)', completed: true },
      { name: 'HealthMonitoringModule — service health checks (API, DB, Redis, WebSocket, Storage)', completed: true },
      { name: '@Cron every 5 minutes — automated health check with persistence', completed: true },
      { name: 'Health history API — GET /health/history with service filter and time range', completed: true },
      { name: 'Uptime percentage calculation — per-service over configurable period', completed: true },
      { name: 'Detailed health endpoint — GET /health/detailed with all service statuses', completed: true },
      { name: 'Migration — health_checks table with service and checkedAt indexes', completed: true },
    ],
  },
  {
    id: 26,
    name: 'Polish — UX Refinement & Accessibility',
    status: 'completed',
    startDate: '2027-02-22',
    endDate: '2027-03-07',
    completionPercent: 100,
    features: [
      { name: 'Awards list page — KPI cards, search, status filter, paginated table', completed: true },
      { name: 'Contracts list page — KPI cards (total, active, expiring, value), search, status filter, paginated table', completed: true },
      { name: 'Analytics dashboard page — spend/savings KPIs, spend by category chart, events by status, monthly trend bars', completed: true },
      { name: 'All pages use useTranslations with fallback pattern', completed: true },
      { name: 'Tailwind logical properties only (ms-, me-, ps-, pe-, start-, end-)', completed: true },
      { name: 'i18n keys added for awards, contracts, analytics, deadlines sections', completed: true },
    ],
  },
  {
    id: 27,
    name: 'Launch — Final Testing & Deployment',
    status: 'completed',
    startDate: '2027-03-08',
    endDate: '2027-03-21',
    completionPercent: 100,
    features: [
      { name: 'SystemModule — GET /system/info (version, environment, uptime, modules, nodeVersion, prismaModels)', completed: true },
      { name: 'SystemModule — GET /system/migrations (list of applied Prisma migrations)', completed: true },
      { name: 'All 27 modules registered in AppModule', completed: true },
      { name: 'All sprint progress data updated — 27/27 sprints completed', completed: true },
      { name: 'Feature area percentages — all areas at 100%', completed: true },
      { name: 'Sidebar version updated to v1.0.0 — Launch', completed: true },
    ],
  },
];

export const featureAreas: FeatureArea[] = [
  { name: 'Multi-Tenancy & Auth', color: 'bg-accent', sprintRange: 'Sprint 1', progressPercent: 100 },
  { name: 'RFx Module', color: 'bg-blue-500', sprintRange: 'Sprints 2–5', progressPercent: 100 },
  { name: 'Auctions', color: 'bg-amber-500', sprintRange: 'Sprints 6–8', progressPercent: 100 },
  { name: 'Evaluations', color: 'bg-emerald-500', sprintRange: 'Sprints 9–10', progressPercent: 100 },
  { name: 'Awards & Contracts', color: 'bg-violet-500', sprintRange: 'Sprints 11–12', progressPercent: 100 },
  { name: 'Supplier Portal', color: 'bg-rose-500', sprintRange: 'Sprints 13–15', progressPercent: 100 },
  { name: 'Analytics & Reporting', color: 'bg-cyan-500', sprintRange: 'Sprints 16–17', progressPercent: 100 },
  { name: 'Notifications', color: 'bg-orange-500', sprintRange: 'Sprints 18–19', progressPercent: 100 },
  { name: 'Advanced Features', color: 'bg-indigo-500', sprintRange: 'Sprints 20–23', progressPercent: 100 },
  { name: 'Performance & Scale', color: 'bg-teal-500', sprintRange: 'Sprints 24–25', progressPercent: 100 },
  { name: 'Polish & Launch', color: 'bg-pink-500', sprintRange: 'Sprints 26–27', progressPercent: 100 },
];

export function getOverallProgress(): number {
  const total = sprints.reduce((sum, s) => sum + s.completionPercent, 0);
  return Math.round(total / sprints.length);
}

export function getCompletedCount(): number {
  return sprints.filter((s) => s.status === 'completed').length;
}

export function getCurrentSprint(): Sprint | undefined {
  return sprints.find((s) => s.status === 'in-progress');
}

export function getSprintsByStatus(status: SprintStatus): Sprint[] {
  return sprints.filter((s) => s.status === status);
}

export function getMonthsElapsed(): number {
  const start = new Date(PROJECT_START);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, Math.min(TOTAL_MONTHS, months));
}
