'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime } from '@/lib/format';
import {
  FileText,
  Gavel,
  Users,
  TrendingDown,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Bell,
  Zap,
  FileCheck,
  Send,
  Award,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { OnboardingWizard, useOnboarding } from '@/components/onboarding/OnboardingWizard';
import { GuidedTour, useTour } from '@/components/guide/GuidedTour';
import { dashboardTour } from '@/components/guide/tour-configs';
import { HelpCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardKpis {
  activeEvents: number;
  liveAuctions: number;
  registeredSuppliers: number;
  avgSavings: number;
  activeContracts: number;
  pendingApprovals: number;
}

interface RecentActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: string;
}

interface PendingActionItem {
  id: string;
  type: string;
  title: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
}

interface DeadlineEvent {
  id: string;
  refNumber: string;
  title: string;
  submissionDeadline: string;
  _count: { invitations: number; bids: number };
}

interface LiveAuction {
  id: string;
  rfxEventId: string | null;
  refNumber: string;
  title: string;
  auctionType: string;
  currency: string;
  endAt: string | null;
  timeRemaining: number | null;
  extensionCount: number;
  totalBids: number;
  totalSuppliers: number;
  bestPrice: number | null;
  lastBidAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<string, typeof FileText> = {
  PUBLISH: Send,
  BID_SUBMIT: FileCheck,
  AWARD: Award,
  EVALUATE: ShieldCheck,
  CREATE: FileText,
  UPDATE: Activity,
  INVITE: Users,
};

function actionIcon(action: string) {
  const Icon = ACTION_ICONS[action] || Activity;
  return <Icon className="h-4 w-4" />;
}

function actionColor(action: string): string {
  switch (action) {
    case 'PUBLISH':
    case 'AWARD':
      return 'text-success bg-success/10';
    case 'BID_SUBMIT':
    case 'CREATE':
      return 'text-accent bg-accent/10';
    case 'EVALUATE':
      return 'text-warning bg-warning/10';
    default:
      return 'text-text-muted bg-bg-subtle';
  }
}

function priorityClasses(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-error/10 text-error';
    case 'MEDIUM':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-bg-subtle text-text-muted';
  }
}

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <div className="bg-bg-surface border border-border border-t-2 border-t-border rounded-lg p-5 shadow-card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-bg-subtle rounded" />
        <div className="h-9 w-9 rounded-lg bg-bg-subtle" />
      </div>
      <div className="h-8 w-16 bg-bg-subtle rounded mb-2.5" />
      <div className="h-3 w-20 bg-bg-subtle rounded" />
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-bg-subtle flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 bg-bg-subtle rounded" />
            <div className="h-3 w-1/2 bg-bg-subtle rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  const [userName, setUserName] = useState('');
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[] | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingActionItem[] | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineEvent[] | null>(null);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[] | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const [showTour, setShowTour] = useState(false);
  const { completed: tourCompleted } = useTour('dashboard');

  useEffect(() => {
    getProfile()
      .then((p) => setUserName(p.firstName))
      .catch(() => {});

    api.get<DashboardKpis>('/dashboard/kpis')
      .then(setKpis)
      .catch(() => {
        setKpis({ activeEvents: 0, liveAuctions: 0, registeredSuppliers: 0, avgSavings: 0, activeContracts: 0, pendingApprovals: 0 });
        setErrors((prev) => ({ ...prev, kpis: true }));
      });

    api.get<RecentActivityItem[]>('/dashboard/recent-activity')
      .then(setRecentActivity)
      .catch(() => {
        setRecentActivity([]);
        setErrors((prev) => ({ ...prev, activity: true }));
      });

    api.get<PendingActionItem[]>('/dashboard/pending-actions')
      .then(setPendingActions)
      .catch(() => {
        setPendingActions([]);
        setErrors((prev) => ({ ...prev, actions: true }));
      });

    api.get<DeadlineEvent[]>('/rfx-events/deadlines/upcoming')
      .then(setDeadlines)
      .catch(() => {
        setDeadlines([]);
        setErrors((prev) => ({ ...prev, deadlines: true }));
      });

    api.get<LiveAuction[]>('/dashboard/live-auctions')
      .then(setLiveAuctions)
      .catch(() => {
        setLiveAuctions([]);
        setErrors((prev) => ({ ...prev, liveAuctions: true }));
      });
  }, []);

  // ---- Deadline helpers ----
  function daysLeft(d: string) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return t('today');
    if (days === 1) return t('tomorrow');
    return t('daysLeft', { days });
  }

  function urgencyColor(d: string) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 3) return 'text-error font-bold';
    if (days <= 7) return 'text-warning font-semibold';
    return 'text-text-muted';
  }

  // ---- KPI card config (uses live data) ----
  const kpiCards = kpis
    ? [
        {
          title: t('kpi.activeEvents'),
          value: String(kpis.activeEvents),
          icon: FileText,
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          accentColor: '#2563EB',
        },
        {
          title: t('kpi.liveAuctions'),
          value: String(kpis.liveAuctions),
          icon: Gavel,
          color: 'text-error',
          bgColor: 'bg-error/10',
          accentColor: '#DC2626',
        },
        {
          title: t('kpi.registeredSuppliers'),
          value: String(kpis.registeredSuppliers),
          icon: Users,
          color: 'text-success',
          bgColor: 'bg-success/10',
          accentColor: '#059669',
        },
        {
          title: t('kpi.avgSavings'),
          value: `${kpis.avgSavings}%`,
          icon: TrendingDown,
          color: 'text-success',
          bgColor: 'bg-success/10',
          accentColor: '#059669',
        },
      ]
    : null;

  return (
    <div className="max-w-7xl">
      {showOnboarding && <OnboardingWizard onDismiss={dismissOnboarding} />}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-text-primary">
            {userName ? t('welcomeBack', { name: userName }) : t('title')}
          </h1>
          <p className="text-text-muted text-body mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTour(true)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/5 transition-colors border border-border"
            title="Take Tour"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <Link
            href="/events/create"
            className="btn-primary hidden md:inline-flex"
            data-tour="new-event"
          >
            <FileText className="h-4 w-4" />
            {t('newEvent')}
          </Link>
        </div>
      </div>

      {/* Guided Tour */}
      {showTour && (
        <GuidedTour
          tourId="dashboard"
          steps={dashboardTour}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}

      {/* KPI Cards */}
      <div data-tour="kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards
          ? kpiCards.map((kpi) => (
              <div
                key={kpi.title}
                className="bg-bg-surface border border-border border-t-2 rounded-lg p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
                style={{ borderTopColor: kpi.accentColor }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-text-muted text-[12.5px] font-medium uppercase tracking-wide">
                    {kpi.title}
                  </span>
                  <div className={`h-9 w-9 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                    <kpi.icon className={`h-[18px] w-[18px] ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-[30px] font-bold text-text-primary leading-none mb-2.5 font-mono">
                  {kpi.value}
                </p>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div data-tour="recent-activity" className="bg-bg-surface border border-border rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sub-section text-text-primary flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-muted" />
              {t('recentActivity')}
            </h2>
            <Link
              href="/events"
              className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
            >
              {t('viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentActivity === null ? (
            <ListSkeleton rows={5} />
          ) : recentActivity.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Activity className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-text-muted">{t('noRecentActivity')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-bg-subtle/60 transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${actionColor(item.action)}`}
                  >
                    {actionIcon(item.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] text-text-primary truncate">
                      {item.description}
                    </p>
                    <p className="text-[12px] text-text-muted mt-0.5">
                      {relativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div data-tour="pending-actions" className="bg-bg-surface border border-border rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sub-section text-text-primary flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t('pendingActions')}
              {pendingActions && pendingActions.length > 0 && (
                <span className="ms-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-error text-white text-[10px] font-bold">
                  {pendingActions.length}
                </span>
              )}
            </h2>
          </div>

          {pendingActions === null ? (
            <ListSkeleton rows={4} />
          ) : pendingActions.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-50" />
              <p className="text-sm text-text-muted">{t('noPendingActions')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingActions.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                >
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.priority === 'HIGH'
                        ? 'bg-error'
                        : item.priority === 'MEDIUM'
                          ? 'bg-warning'
                          : 'bg-text-muted'
                    }`}
                  />
                  <p className="text-[13.5px] text-text-primary flex-1 truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${priorityClasses(item.priority)}`}
                    >
                      {t(`priority.${item.priority.toLowerCase()}`)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Auctions */}
      {liveAuctions !== null && liveAuctions.length > 0 && (
        <div className="mt-6 bg-bg-surface border border-border rounded-lg shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <h2 className="text-sub-section text-text-primary">{t('liveAuctionsTitle')}</h2>
              <span className="text-[11px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                {liveAuctions.length} {t('liveLabel')}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {liveAuctions.map((auction) => {
              const mins = auction.timeRemaining ? Math.floor(auction.timeRemaining / 60000) : 0;
              const hrs = Math.floor(mins / 60);
              const remainMins = mins % 60;
              const timeStr = hrs > 0 ? `${hrs}h ${remainMins}m` : `${remainMins}m`;
              const isUrgent = mins < 30;
              return (
                <Link
                  key={auction.id}
                  href={auction.rfxEventId ? `/events/${auction.rfxEventId}` : `/auctions/${auction.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-bg-subtle/60 transition-colors"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-error/10' : 'bg-success/10'}`}>
                    <Gavel className={`h-5 w-5 ${isUrgent ? 'text-error' : 'text-success'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{auction.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-muted">
                      <span className="font-mono">{auction.refNumber}</span>
                      <span>{t('bidsLabel', { count: auction.totalBids })}</span>
                      <span>{t('suppliersLabel', { count: auction.totalSuppliers })}</span>
                      {auction.bestPrice && (
                        <span className="font-semibold text-text-secondary">
                          {auction.currency} {auction.bestPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <p className={`text-[14px] font-bold font-mono ${isUrgent ? 'text-error' : 'text-success'}`}>
                      {timeStr}
                    </p>
                    <p className="text-[10px] text-text-muted">{t('remainingLabel')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      <div data-tour="deadlines" className="mt-6 bg-bg-surface border border-border rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sub-section text-text-primary flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text-muted" />
            {t('upcomingDeadlines')}
          </h2>
          <Link
            href="/deadlines"
            className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
          >
            {t('viewAll')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {deadlines === null ? (
          <ListSkeleton rows={3} />
        ) : deadlines.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Calendar className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-muted">{t('noDeadlines')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deadlines.slice(0, 5).map((evt) => (
              <Link
                key={evt.id}
                href={`/events/${evt.id}`}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-bg-subtle/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-text-muted">{evt.refNumber}</span>
                    <span className="text-[13.5px] text-text-primary truncate">{evt.title}</span>
                  </div>
                  <div className="text-[12px] text-text-muted">
                    {t('invited', { count: evt._count.invitations })} · {t('bidsReceived', { count: evt._count.bids })}
                    {' · '}
                    {formatDateTime(evt.submissionDeadline)}
                  </div>
                </div>
                <div className={`text-sm flex-shrink-0 font-medium ${urgencyColor(evt.submissionDeadline)}`}>
                  {daysLeft(evt.submissionDeadline)}
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
