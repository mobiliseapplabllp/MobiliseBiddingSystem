'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime } from '@/lib/format';
import {
  Bot, Play, Loader2, CheckCircle2, XCircle, Clock, Calendar,
  AlertTriangle, Monitor, BarChart3, ChevronLeft, ChevronRight,
  Eye, Trash2, Image, X, Download, Copy, Check,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Suite { name: string; passed: number; failed: number; skipped: number; errors?: string[]; }

interface TestRunSummary {
  id: string;
  status: string;
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  suites: Suite[] | null;
  environment: string;
}

interface TestRunDetail extends TestRunSummary {
  output: string | null;
  screenshots: string[];
}

interface LiveResult {
  id?: string;
  status: string;
  liveLog?: string;
  [key: string]: unknown;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function TestReportsPage() {
  const t = useTranslations('admin');

  const [runs, setRuns] = useState<TestRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<TestRunDetail | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const [running, setRunning] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: TestRunSummary[]; meta: { total: number } }>(`/system/test-runs?page=${page}&pageSize=10`);
      setRuns(res.data);
      setTotal(res.meta.total);
    } catch { setRuns([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Poll while running
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(async () => {
      try {
        const res = await api.get<LiveResult>('/system/test-results');
        setLiveResult(res);
        if (res.status !== 'running') { setRunning(false); fetchRuns(); }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(iv);
  }, [running, fetchRuns]);

  const startTests = async () => {
    try {
      await api.post('/system/run-tests');
      setRunning(true);
      setLiveResult({ status: 'running' });
    } catch (err: unknown) {
      setLiveResult({ status: 'error' });
    }
  };

  const viewRun = async (id: string) => {
    try {
      const detail = await api.get<TestRunDetail>(`/system/test-runs/${id}`);
      setSelectedRun(detail);
      setShowOutput(false);
      setShowScreenshots(false);
    } catch { /* ignore */ }
  };

  const deleteRun = async (id: string) => {
    if (!window.confirm('Delete this test run and its data?')) return;
    try {
      await api.delete(`/system/test-runs/${id}`);
      if (selectedRun?.id === id) setSelectedRun(null);
      fetchRuns();
    } catch { /* ignore */ }
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete ALL test runs? This cannot be undone.')) return;
    try {
      await api.delete('/system/test-runs');
      setSelectedRun(null);
      fetchRuns();
    } catch { /* ignore */ }
  };

  // KPIs
  const lastRun = runs[0];
  const lastPassRate = lastRun && lastRun.totalTests > 0 ? Math.round((lastRun.passed / lastRun.totalTests) * 100) : 0;
  const avgDuration = runs.length > 0 ? Math.round(runs.filter((r) => r.durationMs).reduce((s, r) => s + (r.durationMs ?? 0), 0) / Math.max(1, runs.filter((r) => r.durationMs).length) / 1000) : 0;

  const screenshotUrl = (filename: string) => `${API_BASE}/system/test-screenshots/${filename}`;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">{t('testReports.title', 'Test Reports')}</h1>
          <p className="text-text-muted text-body mt-1">{t('testReports.subtitle', 'Robot test execution history and results')}</p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button onClick={deleteAll} className="btn-secondary text-[12px] flex items-center gap-1.5 text-error hover:bg-error/5">
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          )}
          <button onClick={startTests} disabled={running} className="btn-primary flex items-center gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Running...' : 'Run Robot Test'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<BarChart3 className="h-4 w-4 text-accent" />} bg="bg-accent/10" border="border-t-accent" label="Total Runs" value={String(total)} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-success" />} bg="bg-success/10" border="border-t-success" label="Last Pass Rate" value={`${lastPassRate}%`} />
        <KpiCard icon={<Clock className="h-4 w-4 text-warning" />} bg="bg-warning/10" border="border-t-warning" label="Avg Duration" value={`${avgDuration}s`} />
        <KpiCard icon={<Calendar className="h-4 w-4 text-text-muted" />} bg="bg-bg-subtle" border="border-t-border" label="Last Run" value={lastRun ? formatDateTime(lastRun.startedAt) : '—'} />
      </div>

      {/* Live Running Panel */}
      {running && liveResult && (
        <div className="bg-bg-surface border border-accent/30 rounded-xl shadow-card mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Tests Running...</p>
              <p className="text-[12px] text-text-muted">Watch Chrome — robot is testing all pages live</p>
            </div>
          </div>
          {liveResult.liveLog && (
            <pre className="px-5 py-3 text-[11px] font-mono text-text-secondary bg-bg-subtle/30 max-h-48 overflow-auto whitespace-pre-wrap">
              {liveResult.liveLog}
            </pre>
          )}
        </div>
      )}

      {/* Selected Run Detail */}
      {selectedRun && (
        <div className="bg-bg-surface border border-border rounded-xl shadow-card mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedRun.status} />
              <div>
                <p className="text-[14px] font-bold text-text-primary">Test Run Detail</p>
                <p className="text-[12px] text-text-muted">
                  {formatDateTime(selectedRun.startedAt)} · {selectedRun.durationMs ? `${(selectedRun.durationMs / 1000).toFixed(1)}s` : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => deleteRun(selectedRun.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-error hover:bg-error/5 transition-colors" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setSelectedRun(null)} className="text-[12px] text-text-muted hover:text-text-primary">Close</button>
            </div>
          </div>

          {/* Summary */}
          <div className="px-5 py-3 bg-bg-subtle/30 border-b border-border flex items-center gap-6 text-[13px]">
            <span className="text-success font-bold">{selectedRun.passed} passed</span>
            <span className="text-error font-bold">{selectedRun.failed} failed</span>
            <span className="text-text-muted">{selectedRun.skipped} skipped</span>
            <span className="text-text-muted">Total: {selectedRun.totalTests}</span>
          </div>

          {/* Per-suite breakdown */}
          {selectedRun.suites && selectedRun.suites.length > 0 && (
            <div className="divide-y divide-border">
              {selectedRun.suites.map((suite, i) => {
                const tot = suite.passed + suite.failed + suite.skipped;
                const rate = tot > 0 ? Math.round((suite.passed / tot) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${suite.failed > 0 ? 'bg-error/10' : 'bg-success/10'}`}>
                          {suite.failed > 0 ? <XCircle className="h-3.5 w-3.5 text-error" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        </div>
                        <span className="text-[13px] font-medium text-text-primary">{suite.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[12px]">
                        <span className="text-success font-semibold">{suite.passed}✓</span>
                        {suite.failed > 0 && <span className="text-error font-semibold">{suite.failed}✗</span>}
                        <div className="w-16 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${suite.failed > 0 ? 'bg-error' : 'bg-success'}`} style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-text-muted w-8 text-end font-mono">{rate}%</span>
                      </div>
                    </div>
                    {/* Show error details for failed suites */}
                    {suite.errors && suite.errors.length > 0 && (
                      <div className="px-5 pb-3 ps-16">
                        {suite.errors.map((err, ei) => (
                          <div key={ei} className="flex items-start gap-2 mt-1.5 p-2 bg-error/5 border border-error/10 rounded-lg">
                            <XCircle className="h-3.5 w-3.5 text-error shrink-0 mt-0.5" />
                            <p className="text-[11px] font-mono text-error/80 break-all">{err}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action bar: Output + Screenshots */}
          <div className="px-5 py-2.5 border-t border-border flex items-center gap-4">
            {selectedRun.output && (
              <button onClick={() => { setShowOutput(!showOutput); setShowScreenshots(false); }} className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1">
                <Monitor className="h-3 w-3" /> {showOutput ? 'Hide Console Output' : 'Show Console Output'}
              </button>
            )}
            {selectedRun.screenshots && selectedRun.screenshots.length > 0 && (
              <button onClick={() => { setShowScreenshots(!showScreenshots); setShowOutput(false); }} className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1">
                <Image className="h-3 w-3" /> {showScreenshots ? 'Hide Screenshots' : `View All Screenshots (${selectedRun.screenshots.length})`}
              </button>
            )}
          </div>

          {/* Console output */}
          {showOutput && selectedRun.output && (
            <ConsoleOutput text={selectedRun.output} />
          )}

          {/* Screenshots gallery — grouped by suite */}
          {showScreenshots && selectedRun.screenshots && selectedRun.screenshots.length > 0 && (
            <div className="border-t border-border">
              {/* Group screenshots by suite prefix (e.g., "1.1-admin" → suite "1") */}
              {(() => {
                const groups = new Map<string, string[]>();
                const suiteNames = (selectedRun.suites ?? []).map((s) => s.name);
                for (const f of selectedRun.screenshots) {
                  const prefix = f.match(/^(\d+)\./)?.[1] ?? 'other';
                  const groupName = suiteNames.find((_, idx) => String(idx + 1) === prefix)
                    ?? `Suite ${prefix}`;
                  if (!groups.has(groupName)) groups.set(groupName, []);
                  groups.get(groupName)!.push(f);
                }
                return Array.from(groups.entries()).map(([group, files]) => (
                  <div key={group} className="border-b border-border last:border-b-0">
                    <div className="px-5 py-2 bg-bg-subtle/30">
                      <span className="text-[11px] font-semibold text-text-muted uppercase">{group}</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {files.map((filename) => (
                        <button
                          key={filename}
                          onClick={() => setLightboxImg(filename)}
                          className="group relative aspect-video bg-bg-subtle rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                        >
                          <img
                            src={screenshotUrl(filename)}
                            alt={filename}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate">
                            {filename.replace('.png', '')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-5xl max-h-[90vh]">
            <button onClick={() => setLightboxImg(null)} className="absolute -top-3 -end-3 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center text-text-primary hover:bg-bg-subtle z-10">
              <X className="h-4 w-4" />
            </button>
            <img src={screenshotUrl(lightboxImg)} alt={lightboxImg} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            <p className="text-center text-white text-[13px] mt-2 font-mono">{lightboxImg.replace('.png', '')}</p>
          </div>
        </div>
      )}

      {/* Test Runs History Table */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary">Test Run History</h2>
        </div>

        {loading ? (
          <div className="divide-y divide-border animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-8 w-8 rounded-lg bg-bg-subtle" />
                <div className="flex-1 space-y-2"><div className="h-3 w-1/3 bg-bg-subtle rounded" /></div>
              </div>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center">
            <Bot className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-[15px] font-semibold text-text-primary mb-1">No test runs yet</p>
            <p className="text-[13px] text-text-muted">Click "Run Robot Test" to execute the first test suite</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-bg-subtle/50 border-b border-border">
                    <th className="text-start px-5 py-2.5 text-[11px] font-semibold text-text-muted uppercase w-[100px]">Status</th>
                    <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">Date</th>
                    <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase w-[80px]">Duration</th>
                    <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase w-[60px]">Pass</th>
                    <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase w-[60px]">Fail</th>
                    <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase w-[100px]">Rate</th>
                    <th className="w-[80px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.map((run) => {
                    const rate = run.totalTests > 0 ? Math.round((run.passed / run.totalTests) * 100) : 0;
                    return (
                      <tr key={run.id} className="hover:bg-bg-subtle/60 transition-colors">
                        <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
                        <td className="px-4 py-3 text-text-secondary text-[12px]">{formatDateTime(run.startedAt)}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-[12px]">{run.durationMs ? `${(run.durationMs / 1000).toFixed(0)}s` : '—'}</td>
                        <td className="px-4 py-3 text-success font-bold">{run.passed}</td>
                        <td className="px-4 py-3 text-error font-bold">{run.failed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${run.failed > 0 ? 'bg-error' : 'bg-success'}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-text-muted">{rate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => viewRun(run.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/5 transition-colors" title="View detail">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteRun(run.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-error hover:bg-error/5 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > 10 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <p className="text-[12px] text-text-muted">Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 px-3 flex items-center gap-1 text-[12px] border border-border rounded-lg hover:bg-bg-subtle disabled:opacity-40 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <button disabled={page * 10 >= total} onClick={() => setPage(page + 1)} className="h-8 px-3 flex items-center gap-1 text-[12px] border border-border rounded-lg hover:bg-bg-subtle disabled:opacity-40 transition-colors">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    passed:  { icon: CheckCircle2, cls: 'bg-success/10 text-success' },
    failed:  { icon: XCircle,      cls: 'bg-error/10 text-error' },
    running: { icon: Loader2,      cls: 'bg-accent/10 text-accent' },
    error:   { icon: AlertTriangle,cls: 'bg-warning/10 text-warning' },
  }[status] ?? { icon: Clock, cls: 'bg-bg-subtle text-text-muted' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.cls}`}>
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ConsoleOutput({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-t border-border relative">
      <div className="absolute top-2 end-3 z-10">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
            copied
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-bg-surface text-text-muted border border-border hover:text-text-primary hover:border-accent/30 shadow-sm'
          }`}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy Output'}
        </button>
      </div>
      <pre className="px-5 py-3 pe-28 text-[11px] font-mono text-text-secondary bg-bg-subtle/30 max-h-80 overflow-auto whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}

function KpiCard({ icon, bg, border, label, value }: { icon: React.ReactNode; bg: string; border: string; label: string; value: string }) {
  return (
    <div className={`bg-bg-surface border border-border rounded-lg p-4 border-t-2 ${border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-text-muted uppercase tracking-wide">{label}</span>
        <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-[24px] font-bold text-text-primary font-mono">{value}</p>
    </div>
  );
}
