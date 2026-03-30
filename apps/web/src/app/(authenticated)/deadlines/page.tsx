'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ChevronRight, FileText, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime } from '@/lib/format';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DeadlineEvent {
  id: string;
  refNumber: string;
  title: string;
  type: string;
  submissionDeadline: string;
  _count: { invitations: number; bids: number };
}

// ─── Design Tokens ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
  RFI: 'bg-accent/10 text-accent',
  RFP: 'bg-[#7c3aed]/10 text-[#7c3aed]',
  RFQ: 'bg-success/10 text-success',
  ITT: 'bg-warning/10 text-warning',
  REVERSE_AUCTION: 'bg-error/10 text-error',
  DUTCH_AUCTION: 'bg-[#7c3aed]/10 text-[#7c3aed]',
  JAPANESE_AUCTION: 'bg-accent/10 text-accent',
};

function daysUntil(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function urgencyClasses(days: number): { badge: string; text: string } {
  if (days <= 0) return { badge: 'bg-error text-white', text: 'text-error font-bold' };
  if (days <= 3) return { badge: 'bg-error/10 text-error', text: 'text-error font-bold' };
  if (days <= 7) return { badge: 'bg-warning/10 text-warning', text: 'text-warning font-semibold' };
  return { badge: 'bg-bg-subtle text-text-muted', text: 'text-text-secondary' };
}

function daysLabel(days: number, t: (key: string, fallback?: string) => string): string {
  if (days <= 0) return t('overdue', 'Overdue');
  if (days === 1) return t('tomorrow', 'Tomorrow');
  return `${days}d`;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-border animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-bg-subtle shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 bg-bg-subtle rounded" />
            <div className="h-3 w-1/2 bg-bg-subtle rounded" />
          </div>
          <div className="h-6 w-16 bg-bg-subtle rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DeadlinesPage() {
  const t = useTranslations('deadlines');
  const te = useTranslations('events');
  const [events, setEvents] = useState<DeadlineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DeadlineEvent[]>('/rfx-events/deadlines/upcoming')
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter by search
  const filtered = search
    ? events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.refNumber.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  // Sort by deadline (soonest first)
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime()
  );

  // KPI calculations
  const overdue = events.filter((e) => daysUntil(e.submissionDeadline) <= 0).length;
  const thisWeek = events.filter((e) => {
    const d = daysUntil(e.submissionDeadline);
    return d > 0 && d <= 7;
  }).length;
  const total = events.length;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">{t('title', 'Upcoming Deadlines')}</h1>
          <p className="text-text-muted text-body mt-0.5">
            {t('subtitle', 'Published events with submission deadlines in the next 30 days')}
          </p>
        </div>
        <Link href="/events/create" className="btn-primary hidden sm:inline-flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {te('newEvent', 'New Event')}
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-lg p-4 border-t-2 border-t-error">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wide">
              {t('kpiOverdue', 'Overdue')}
            </span>
            <div className="h-8 w-8 rounded-lg bg-error/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-error" />
            </div>
          </div>
          <p className="text-[26px] font-bold text-text-primary font-mono">{overdue}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 border-t-2 border-t-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wide">
              {t('kpiDueThisWeek', 'Due This Week')}
            </span>
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </div>
          <p className="text-[26px] font-bold text-text-primary font-mono">{thisWeek}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4 border-t-2 border-t-accent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-muted uppercase tracking-wide">
              {t('kpiTotalUpcoming', 'Total Upcoming')}
            </span>
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
          </div>
          <p className="text-[26px] font-bold text-text-primary font-mono">{total}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder', 'Search by title or reference...')}
            className="w-full ps-9 pe-4 py-2 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Deadlines Table */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-[15px] font-semibold text-text-primary mb-1">
              {t('noDeadlines', 'No upcoming deadlines')}
            </p>
            <p className="text-[13px] text-text-muted mb-4">
              {t('noDeadlinesDescription', 'No published events have submission deadlines in the next 30 days.')}
            </p>
            <Link href="/events" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-dark font-medium transition-colors">
              {t('viewAllEvents', 'View all events')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_120px_140px_80px] px-5 py-2.5 bg-bg-subtle/50 border-b border-border text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              <span>{t('colEvent', 'Event')}</span>
              <span>{t('colType', 'Type')}</span>
              <span>{t('colResponses', 'Responses')}</span>
              <span>{t('colDeadline', 'Deadline')}</span>
              <span className="text-end">{t('colRemaining', 'Left')}</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {sorted.map((evt) => {
                const days = daysUntil(evt.submissionDeadline);
                const urgency = urgencyClasses(days);
                return (
                  <Link
                    key={evt.id}
                    href={`/events/${evt.id}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_140px_80px] items-center px-5 py-3.5 hover:bg-bg-subtle/60 transition-colors gap-2 sm:gap-0"
                  >
                    {/* Event info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-text-muted">{evt.refNumber}</span>
                      </div>
                      <p className="text-[13px] font-medium text-text-primary truncate">{evt.title}</p>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[evt.type] ?? 'bg-bg-subtle text-text-muted'}`}>
                        {evt.type}
                      </span>
                    </div>

                    {/* Responses */}
                    <div className="text-[12px] text-text-muted">
                      {evt._count.invitations} {t('invited', 'invited')} · {evt._count.bids} {t('bidsLabel', 'bids')}
                    </div>

                    {/* Deadline */}
                    <div className="text-[12px] text-text-secondary flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatDateTime(evt.submissionDeadline)}
                    </div>

                    {/* Days remaining */}
                    <div className="text-end">
                      <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-full text-[11px] font-bold ${urgency.badge}`}>
                        {daysLabel(days, t)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
