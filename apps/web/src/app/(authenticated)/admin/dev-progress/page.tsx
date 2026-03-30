'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { api } from '@/lib/api-client';
import {
  Target,
  CheckCircle2,
  Play,
  Calendar,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bot,
  Loader2,
  XCircle,
  Clock,
  Monitor,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  sprints,
  featureAreas,
  getOverallProgress,
  getCompletedCount,
  getCurrentSprint,
  getMonthsElapsed,
  TOTAL_SPRINTS,
  TOTAL_MONTHS,
  type Sprint,
  type SprintStatus,
} from '@/data/sprint-progress';

const statusBadge: Record<SprintStatus, string> = {
  completed: 'bg-success/10 text-success',
  'in-progress': 'bg-warning/10 text-warning',
  planned: 'bg-slate-100 text-text-secondary',
};

const statusLabel: Record<SprintStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

// ── Risk Register ──────────────────────────────────────────────────────────────

type RiskSeverity = 'Critical' | 'High' | 'Medium';
type RiskStatus = 'Mitigated' | 'In Progress' | 'Open';

interface Risk {
  name: string;
  severity: RiskSeverity;
  affectedSprints: string;
  status: RiskStatus;
}

const risks: Risk[] = [
  { name: 'No audit trail from day 1', severity: 'Critical', affectedSprints: 'Sprints 2–21', status: 'In Progress' },
  { name: 'Analytics data not captured from Sprint 2', severity: 'Critical', affectedSprints: 'Sprints 2–15', status: 'In Progress' },
  { name: 'i18n deferred causing string rework', severity: 'High', affectedSprints: 'Sprints 2–19', status: 'In Progress' },
  { name: 'RBAC not using RolePermission table', severity: 'High', affectedSprints: 'Sprints 2–26', status: 'In Progress' },
  { name: 'localStorage token XSS risk', severity: 'High', affectedSprints: 'Sprint 1+', status: 'In Progress' },
  { name: 'No server-side auth middleware', severity: 'High', affectedSprints: 'Sprints 1–2', status: 'In Progress' },
  { name: 'Supplier identity model undefined before Sprint 3', severity: 'High', affectedSprints: 'Sprint 3', status: 'Open' },
  { name: 'Notification engine too late (Sprint 17)', severity: 'High', affectedSprints: 'Sprints 4–17', status: 'In Progress' },
  { name: 'No Redis before Sprint 5 auctions', severity: 'Medium', affectedSprints: 'Sprint 5', status: 'Open' },
  { name: 'SSO deferred to Sprint 22', severity: 'Medium', affectedSprints: 'Sprint 22', status: 'In Progress' },
  { name: 'Approval workflow hardcoded before Sprint 20 engine', severity: 'Medium', affectedSprints: 'Sprint 10', status: 'Open' },
];

const severityStyles: Record<RiskSeverity, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
};

const riskStatusStyles: Record<RiskStatus, string> = {
  Mitigated: 'bg-success/10 text-success',
  'In Progress': 'bg-warning/10 text-warning',
  Open: 'bg-slate-100 text-text-secondary',
};

// ──────────────────────────────────────────────────────────────────────────────

export default function DevProgressPage() {
  const t = useTranslations('admin');
  const [showAll, setShowAll] = useState(false);

  // Robot Test state
  interface TestResultState {
    status: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    duration?: number | null;
    durationMs?: number | null;
    summary?: string | null;
    stdout?: string | null;
    liveLog?: string | null;
    passed?: number;
    failed?: number;
    skipped?: number;
    totalTests?: number;
    suites?: Array<{ name: string; passed: number; failed: number; skipped: number }> | null;
  }
  const [testResult, setTestResult] = useState<TestResultState>({ status: 'idle' });
  const [showTestOutput, setShowTestOutput] = useState(false);

  // Poll test results when running
  const pollResults = useCallback(async () => {
    try {
      const res = await api.get<TestResultState>('/system/test-results');
      setTestResult(res);
      return res.status;
    } catch {
      return 'idle';
    }
  }, []);

  useEffect(() => {
    pollResults(); // Load last results on mount
  }, [pollResults]);

  useEffect(() => {
    if (testResult.status !== 'running') return;
    const interval = setInterval(async () => {
      const status = await pollResults();
      if (status !== 'running') clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [testResult.status, pollResults]);

  const startTests = async () => {
    try {
      await api.post('/system/run-tests');
      setTestResult({ status: 'running', startedAt: new Date().toISOString(), summary: 'Tests are running...' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start tests';
      setTestResult((prev) => ({ ...prev, status: 'error', summary: msg }));
    }
  };

  // Auto-timeout: if running for more than 10 min with no update, mark as stale
  useEffect(() => {
    if (testResult.status !== 'running' || !testResult.startedAt) return;
    const timer = setTimeout(() => {
      setTestResult((prev) => ({ ...prev, status: 'error', summary: 'Test run timed out (no response after 10 minutes)' }));
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [testResult.status, testResult.startedAt]);

  const overallProgress = getOverallProgress();
  const completedCount = getCompletedCount();
  const currentSprint = getCurrentSprint();
  const monthsElapsed = getMonthsElapsed();

  const visibleSprints = showAll
    ? sprints
    : sprints.filter((s) => s.status !== 'planned');

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h1 className="text-page-title text-text-primary">{t('devProgress.title', 'Development Progress')}</h1>
        <p className="text-text-secondary text-body mt-1">
          {t('devProgress.subtitle', 'eSourcing platform roadmap')} — {TOTAL_SPRINTS} {t('devProgress.sprints', 'sprints')} {t('devProgress.over', 'over')} {TOTAL_MONTHS} {t('devProgress.months', 'months')}
        </p>
      </div>

      {/* Robot Test Panel */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card mb-8 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-text-primary">{t('devProgress.robotTest', 'Robot Testing')}</h2>
              <p className="text-[12px] text-text-muted">{t('devProgress.robotTestSubtitle', 'Automated Playwright browser tests — 8 test suites, 7 personas')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testResult.status !== 'idle' && testResult.status !== 'running' && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                testResult.status === 'passed' ? 'bg-success/10 text-success' :
                testResult.status === 'failed' ? 'bg-error/10 text-error' :
                'bg-warning/10 text-warning'
              }`}>
                {testResult.status === 'passed' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {testResult.summary ?? `${testResult.passed ?? 0} passed, ${testResult.failed ?? 0} failed`}
              </span>
            )}
            <button
              onClick={startTests}
              disabled={testResult.status === 'running'}
              className="btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50"
            >
              {testResult.status === 'running' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('devProgress.testsRunning', 'Running Tests...')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {t('devProgress.runRobotTest', 'Run Robot Test')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Suites */}
        {testResult.status === 'running' && (
          <div className="border-t border-border">
            <div className="px-5 py-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-text-primary">{t('devProgress.testsRunning', 'Running Tests...')}</p>
                <p className="text-[12px] text-text-muted">{t('devProgress.testsRunningDesc', 'Chrome browser is open — watch the robot test your pages live. This may take 2-5 minutes.')}</p>
              </div>
              <span className="text-[11px] font-mono text-text-muted animate-pulse">
                {testResult.startedAt ? `${Math.round((Date.now() - new Date(testResult.startedAt).getTime()) / 1000)}s` : ''}
              </span>
            </div>
            {/* Live console output */}
            {testResult.liveLog && (
              <div className="border-t border-border">
                <pre className="px-5 py-3 text-[11px] font-mono text-text-secondary bg-bg-subtle/30 max-h-48 overflow-auto whitespace-pre-wrap">
                  {testResult.liveLog}
                </pre>
              </div>
            )}
          </div>
        )}

        {testResult.suites && testResult.suites.length > 0 && (
          <div className="divide-y divide-border">
            {testResult.suites.map((suite, i) => {
              const total = suite.passed + suite.failed + suite.skipped;
              const passRate = total > 0 ? Math.round((suite.passed / total) * 100) : 0;
              return (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      suite.failed > 0 ? 'bg-error/10' : 'bg-success/10'
                    }`}>
                      {suite.failed > 0 ? <XCircle className="h-3.5 w-3.5 text-error" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    </div>
                    <span className="text-[13px] font-medium text-text-primary">{suite.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="text-success font-semibold">{suite.passed} passed</span>
                    {suite.failed > 0 && <span className="text-error font-semibold">{suite.failed} failed</span>}
                    {suite.skipped > 0 && <span className="text-text-muted">{suite.skipped} skipped</span>}
                    <div className="w-20 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${suite.failed > 0 ? 'bg-error' : 'bg-success'}`} style={{ width: `${passRate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Duration & Output Toggle */}
        {testResult.finishedAt && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-4 text-[12px] text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(testResult.duration || testResult.durationMs) ? `${((testResult.duration ?? testResult.durationMs ?? 0) / 1000).toFixed(1)}s` : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(testResult.finishedAt).toLocaleTimeString()}
              </span>
            </div>
            {testResult.stdout && (
              <button
                onClick={() => setShowTestOutput(!showTestOutput)}
                className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
              >
                <Monitor className="h-3 w-3" />
                {showTestOutput ? 'Hide Output' : 'Show Output'}
              </button>
            )}
          </div>
        )}

        {/* Raw Output */}
        {showTestOutput && testResult.stdout && (
          <div className="border-t border-border">
            <pre className="px-5 py-4 text-[11px] font-mono text-text-secondary bg-bg-subtle/30 max-h-64 overflow-auto whitespace-pre-wrap">
              {testResult.stdout}
            </pre>
          </div>
        )}

        {/* Test Info (when idle) */}
        {testResult.status === 'idle' && (
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Auth & RBAC', count: 4 },
                { label: 'RFQ Lifecycle', count: 2 },
                { label: 'Auction Flow', count: 1 },
                { label: 'Admin Pages', count: 6 },
                { label: 'Page Navigation', count: '14+' },
                { label: 'Persona Testing', count: 7 },
                { label: 'Responsive', count: 3 },
                { label: 'Login Page', count: 2 },
              ].map((suite) => (
                <div key={suite.label} className="flex items-center gap-2 px-3 py-2 bg-bg-subtle/50 rounded-lg">
                  <Circle className="h-2 w-2 text-text-muted fill-current" />
                  <span className="text-[12px] text-text-secondary">{suite.label}</span>
                  <span className="text-[11px] text-text-muted ms-auto font-mono">{suite.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title={t('devProgress.totalProgress', 'Total Progress')}
          value={`${overallProgress}%`}
          subtitle={`${completedCount} of ${TOTAL_SPRINTS} sprints done`}
          icon={<Target className="h-5 w-5 text-accent" />}
          iconBg="bg-accent/10"
        />
        <KpiCard
          title={t('devProgress.sprintsComplete', 'Sprints Complete')}
          value={`${completedCount}`}
          subtitle={`of ${TOTAL_SPRINTS} total`}
          icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          iconBg="bg-success/10"
        />
        <KpiCard
          title={t('devProgress.currentSprint', 'Current Sprint')}
          value={currentSprint ? `#${currentSprint.id}` : '—'}
          subtitle={currentSprint?.name.split('—')[1]?.trim() ?? 'None active'}
          icon={<Play className="h-5 w-5 text-warning" />}
          iconBg="bg-warning/10"
        />
        <KpiCard
          title={t('devProgress.timeElapsed', 'Time Elapsed')}
          value={`${monthsElapsed} mo`}
          subtitle={`of ${TOTAL_MONTHS} months`}
          icon={<Calendar className="h-5 w-5 text-info" />}
          iconBg="bg-info/10"
        />
      </div>

      {/* Feature Areas */}
      <div className="mb-8">
        <h2 className="text-section-title text-text-primary mb-4">{t('devProgress.featureAreas', 'Feature Areas')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureAreas.map((area) => (
            <div
              key={area.name}
              className="bg-bg-surface rounded-lg border border-border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sub-section text-text-primary">{area.name}</h3>
                <span className="text-caption text-text-secondary">{area.progressPercent}%</span>
              </div>
              <p className="text-caption text-text-secondary mb-3">{area.sprintRange}</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${area.color}`}
                  style={{ width: `${area.progressPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint Timeline */}
      <div className="mb-8">
        <h2 className="text-section-title text-text-primary mb-4">{t('devProgress.sprintTimeline', 'Sprint Timeline')}</h2>
        <div className="bg-bg-surface rounded-lg border border-border p-5 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max px-2">
            {sprints.map((sprint, i) => (
              <div key={sprint.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      sprint.status === 'completed'
                        ? 'bg-success text-white'
                        : sprint.status === 'in-progress'
                          ? 'bg-warning text-white animate-pulse'
                          : 'border-2 border-border text-text-disabled'
                    }`}
                  >
                    {sprint.id}
                  </div>
                  <span className="text-[9px] text-text-secondary mt-1 w-16 text-center truncate">
                    {sprint.name.split('—')[0]?.trim()}
                  </span>
                </div>
                {i < sprints.length - 1 && (
                  <div
                    className={`h-0.5 w-6 mx-0.5 ${
                      sprint.status === 'completed' ? 'bg-success' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Register */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h2 className="text-section-title text-text-primary">{t('devProgress.riskRegister', 'Risk Register')}</h2>
        </div>
        <div className="bg-bg-surface rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold text-caption">{t('devProgress.risk', 'Risk')}</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold text-caption whitespace-nowrap">{t('devProgress.severity', 'Severity')}</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold text-caption whitespace-nowrap">{t('devProgress.affectedSprints', 'Affected Sprints')}</th>
                  <th className="text-left px-4 py-3 text-text-secondary font-semibold text-caption">{t('devProgress.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk, i) => (
                  <tr
                    key={risk.name}
                    className={`border-b border-border last:border-0 hover:bg-slate-50 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="px-4 py-3 text-text-primary font-medium">{risk.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${severityStyles[risk.severity]}`}
                      >
                        {risk.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{risk.affectedSprints}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${riskStatusStyles[risk.status]}`}
                      >
                        {risk.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-slate-50/60 flex gap-4 flex-wrap">
            <span className="text-caption text-text-secondary">
              {risks.filter((r) => r.severity === 'Critical').length} Critical
            </span>
            <span className="text-caption text-text-secondary">
              {risks.filter((r) => r.severity === 'High').length} High
            </span>
            <span className="text-caption text-text-secondary">
              {risks.filter((r) => r.severity === 'Medium').length} Medium
            </span>
            <span className="text-caption text-text-secondary ms-auto">
              {risks.filter((r) => r.status === 'Open').length} Open ·{' '}
              {risks.filter((r) => r.status === 'In Progress').length} In Progress ·{' '}
              {risks.filter((r) => r.status === 'Mitigated').length} Mitigated
            </span>
          </div>
        </div>
      </div>

      {/* Sprint Detail Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-section-title text-text-primary">{t('devProgress.sprintDetails', 'Sprint Details')}</h2>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors font-medium"
          >
            {showAll ? (
              <>
                {t('devProgress.hidePlanned', 'Hide planned')} <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                {t('devProgress.showAll', 'Show all')} {TOTAL_SPRINTS} {t('devProgress.sprints', 'sprints')} <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {visibleSprints.map((sprint) => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-bg-surface rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-body-small text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          <p className="text-caption text-text-secondary mt-0.5">{subtitle}</p>
        </div>
        <div className={`h-9 w-9 rounded-md ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SprintCard({ sprint }: { sprint: Sprint }) {
  const totalFeatures = sprint.features.length;
  const doneFeatures = sprint.features.filter((f) => f.completed).length;

  return (
    <div className="bg-bg-surface rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sub-section text-text-primary">
            Sprint {sprint.id} — {sprint.name.split('—')[1]?.trim() ?? sprint.name}
          </h3>
          <p className="text-caption text-text-secondary mt-0.5">
            {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[sprint.status]}`}
        >
          {statusLabel[sprint.status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              sprint.status === 'completed'
                ? 'bg-success'
                : sprint.status === 'in-progress'
                  ? 'bg-warning'
                  : 'bg-slate-200'
            }`}
            style={{ width: `${sprint.completionPercent}%` }}
          />
        </div>
        <span className="text-caption font-medium text-text-secondary w-10 text-right">
          {sprint.completionPercent}%
        </span>
      </div>

      {/* Feature checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
        {sprint.features.map((feature) => (
          <div key={feature.name} className="flex items-center gap-2">
            {feature.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-text-disabled shrink-0" />
            )}
            <span
              className={`text-body-small ${
                feature.completed ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {feature.name}
            </span>
          </div>
        ))}
      </div>

      {totalFeatures > 0 && (
        <p className="text-caption text-text-secondary mt-3 pt-3 border-t border-border">
          {doneFeatures} of {totalFeatures} features complete
        </p>
      )}
    </div>
  );
}

