'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  Award,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency as fmtCurrency, formatDate } from '@/lib/format';

interface AwardRecord {
  id: string;
  title: string;
  awardMode: string;
  status: string;
  totalValue: number | null;
  currency: string;
  createdAt: string;
  rfxEvent?: { refNumber: string; title: string };
  _count?: { items: number };
}

interface AwardListResponse {
  data: AwardRecord[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
  DRAFT: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  PENDING_APPROVAL: { color: 'text-amber-600', bgColor: 'bg-amber-50' },
  APPROVED: { color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  REJECTED: { color: 'text-red-600', bgColor: 'bg-red-50' },
  NOTIFIED: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  COMPLETED: { color: 'text-green-700', bgColor: 'bg-green-50' },
  CANCELLED: { color: 'text-gray-400', bgColor: 'bg-gray-50' },
};

export default function AwardsPage() {
  const t = useTranslations('awards');
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });

  useEffect(() => {
    fetchAwards();
  }, [page, statusFilter]);

  async function fetchAwards() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<AwardListResponse>(`/awards?${params.toString()}`);
      setAwards(res.data);
      setMeta(res.meta);
    } catch {
      setAwards([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAwards();
  }

  function formatCurrencyLocal(value: number | null, currency: string) {
    if (value === null) return '-';
    return fmtCurrency(value, currency);
  }

  const kpiCards = [
    {
      title: t('kpi.totalAwards', 'Total Awards'),
      value: String(meta.total),
      icon: Award,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      accentColor: '#2563EB',
    },
    {
      title: t('kpi.pendingApproval', 'Pending Approval'),
      value: String(awards.filter((a) => a.status === 'PENDING_APPROVAL').length),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      accentColor: '#D97706',
    },
    {
      title: t('kpi.approved', 'Approved'),
      value: String(awards.filter((a) => a.status === 'APPROVED').length),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      accentColor: '#059669',
    },
    {
      title: t('kpi.notified', 'Suppliers Notified'),
      value: String(awards.filter((a) => a.status === 'NOTIFIED').length),
      icon: Bell,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      accentColor: '#2563EB',
    },
  ];

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <Award className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-page-title text-text-primary">{t('title', 'Awards')}</h1>
            <p className="text-text-muted text-body mt-0.5">
              {t('subtitle', 'Manage award decisions, approvals, and supplier notifications')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-bg-surface border border-border border-t-2 rounded-lg p-5 shadow-card"
            style={{ borderTopColor: kpi.accentColor }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-muted text-[12.5px] font-medium uppercase tracking-wide">
                {kpi.title}
              </span>
              <div className={`h-9 w-9 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                <kpi.icon className={`h-[18px] w-[18px] ${kpi.color}`} />
              </div>
            </div>
            <p className="text-[28px] font-bold text-text-primary leading-none font-mono">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder', 'Search by title or event reference...')}
                className="w-full ps-9 pe-4 py-2 text-sm border border-border rounded-md bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-md px-3 py-2 bg-bg-subtle"
            >
              <option value="">{t('allStatuses', 'All Statuses')}</option>
              <option value="DRAFT">{t('statusDraft', 'Draft')}</option>
              <option value="PENDING_APPROVAL">{t('statusPending', 'Pending Approval')}</option>
              <option value="APPROVED">{t('statusApproved', 'Approved')}</option>
              <option value="REJECTED">{t('statusRejected', 'Rejected')}</option>
              <option value="NOTIFIED">{t('statusNotified', 'Notified')}</option>
              <option value="COMPLETED">{t('statusCompleted', 'Completed')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-text-muted">{t('loading', 'Loading awards...')}</p>
          </div>
        ) : awards.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Award className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-text-primary">{t('noAwardsTitle', 'No awards yet')}</p>
            <p className="text-xs text-text-muted mt-1">{t('noAwardsBody', 'Award decisions will appear here after evaluation is complete.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/50">
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableTitle', 'Title')}</th>
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableEvent', 'Event')}</th>
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableMode', 'Mode')}</th>
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableValue', 'Value')}</th>
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableStatus', 'Status')}</th>
                  <th className="text-start px-5 py-3 font-medium text-text-muted">{t('tableCreated', 'Created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {awards.map((award) => {
                  const statusCfg = STATUS_CONFIG[award.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={award.id} className="hover:bg-bg-subtle/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-text-primary">{award.title}</td>
                      <td className="px-5 py-3 text-text-muted text-xs font-mono">
                        {award.rfxEvent?.refNumber ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-text-muted">{award.awardMode.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 font-mono text-text-primary">
                        {formatCurrencyLocal(award.totalValue, award.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.color} ${statusCfg.bgColor}`}>
                          {award.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted text-xs">
                        {formatDate(award.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/awards/${award.id}`} className="text-text-muted hover:text-accent transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {t('showing', 'Showing')} {(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)} {t('of', 'of')} {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-bg-subtle disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-1.5 rounded hover:bg-bg-subtle disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
