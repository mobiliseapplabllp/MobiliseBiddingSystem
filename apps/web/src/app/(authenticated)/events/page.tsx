'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search, Calendar, Layers, Pencil } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDate as fmtDate } from '@/lib/format';

interface RfxEvent {
  id: string;
  refNumber: string;
  title: string;
  type: string;
  status: string;
  currency: string;
  submissionDeadline: string | null;
  createdAt: string;
  lots: { id: string }[];
}

interface PaginatedResponse {
  data: RfxEvent[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-blue-50 text-blue-700',
  AUCTION_OPEN: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-amber-50 text-amber-700',
  IN_EVALUATION: 'bg-violet-50 text-violet-700',
  CANCELLED: 'bg-red-50 text-red-600',
  AWARDED: 'bg-teal-50 text-teal-700',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  AUCTION_OPEN: 'Auction Open',
  CLOSED: 'Closed',
  IN_EVALUATION: 'In Evaluation',
  CANCELLED: 'Cancelled',
  AWARDED: 'Awarded',
};

const TYPE_LABELS: Record<string, string> = {
  RFI: 'RFI',
  RFP: 'RFP',
  RFQ: 'RFQ',
  ITT: 'ITT',
  REVERSE_AUCTION: 'Reverse Auction',
  DUTCH_AUCTION: 'Dutch Auction',
  JAPANESE_AUCTION: 'Japanese Auction',
};

const TYPE_STYLES: Record<string, string> = {
  RFI: 'bg-gray-100 text-gray-700',
  RFP: 'bg-blue-50 text-blue-700',
  RFQ: 'bg-amber-50 text-amber-700',
  ITT: 'bg-slate-100 text-slate-700',
  REVERSE_AUCTION: 'bg-emerald-50 text-emerald-700',
  DUTCH_AUCTION: 'bg-violet-50 text-violet-700',
  JAPANESE_AUCTION: 'bg-cyan-50 text-cyan-700',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return fmtDate(dateStr);
}

export default function EventsPage() {
  const t = useTranslations('events');
  const [events, setEvents] = useState<RfxEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const res = await api.get<PaginatedResponse>(`/rfx-events?${params.toString()}`);
      setEvents(res.data);
      setTotal(res.meta.total);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">{t('rfxEvents', 'RFx Events')}</h1>
          <p className="text-text-secondary text-body mt-0.5">
            {t('manageEvents', 'Manage RFI, RFP, RFQ, and ITT events')}
          </p>
        </div>
        <Link
          href="/events/create"
          className="inline-flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newEvent', 'New Event')}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 mb-5 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-bg-base border border-border rounded-md px-3 py-2">
          <Search className="h-4 w-4 text-text-disabled flex-shrink-0" />
          <input
            type="text"
            placeholder={t('searchEvents', 'Search by title, ref, or internal ref...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('searchEvents', 'Search by title, ref, or internal ref...')}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('filterByStatus', 'Filter by status')}
          className="bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="">{t('allStatuses', 'All Statuses')}</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label={t('filterByType', 'Filter by type')}
          className="bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="">{t('allTypes', 'All Types')}</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-secondary text-body">
            {t('loadingEvents', 'Loading events...')}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-12 w-12 rounded-full bg-bg-surface-hover flex items-center justify-center">
              <FileText className="h-6 w-6 text-text-disabled" />
            </div>
            <p className="text-text-primary font-medium">{t('noEventsYet', 'No events yet')}</p>
            <p className="text-text-secondary text-body-small">{t('createFirstEvent', 'Create your first RFx event to get started.')}</p>
            <Link
              href="/events/create"
              className="mt-2 inline-flex items-center gap-2 bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('newEvent', 'New Event')}
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border bg-bg-surface-hover">
                  <th scope="col" className="text-start px-5 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide w-[140px]">{t('reference', 'Reference')}</th>
                  <th scope="col" className="text-start px-4 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide">{t('title', 'Title')}</th>
                  <th scope="col" className="text-start px-4 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide w-[90px]">{t('type', 'Type')}</th>
                  <th scope="col" className="text-start px-4 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide w-[110px]">{t('status', 'Status')}</th>
                  <th scope="col" className="text-start px-4 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide w-[120px] hidden lg:table-cell">{t('deadline', 'Deadline')}</th>
                  <th scope="col" className="text-start px-4 py-3 text-caption text-text-secondary font-semibold uppercase tracking-wide w-[60px]">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-bg-surface-hover transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/events/${event.id}`} className="text-sm font-mono font-medium text-accent hover:text-accent-dark hover:underline transition-colors">
                        {event.refNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="block group">
                        <p className="text-sm text-text-primary font-medium truncate group-hover:text-accent transition-colors">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-text-muted">{event.lots.length} lots</span>
                          <span className="text-[11px] text-text-muted hidden sm:inline">· {formatDate(event.createdAt)}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold text-text-secondary bg-bg-surface-hover px-2 py-0.5 rounded">
                        {event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[event.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[event.status] ?? event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[12px] text-text-secondary flex items-center gap-1">
                        {event.submissionDeadline && <Calendar className="h-3 w-3 flex-shrink-0" />}
                        {formatDate(event.submissionDeadline)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {event.status === 'DRAFT' && (
                          <Link
                            href={`/events/${event.id}/edit`}
                            title={t('edit')}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/5 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 20 && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} events
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-border rounded-md text-text-secondary disabled:opacity-40 hover:bg-bg-surface-hover transition-colors"
                  >
                    {t('previous', 'Previous')}
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 20 >= total}
                    className="px-3 py-1.5 text-sm border border-border rounded-md text-text-secondary disabled:opacity-40 hover:bg-bg-surface-hover transition-colors"
                  >
                    {t('next', 'Next')}
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
