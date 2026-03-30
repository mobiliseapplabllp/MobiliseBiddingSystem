'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  ClipboardCheck, Plus, Search, Download, Upload, ChevronRight,
  Calendar, Loader2, Users, BarChart3,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

interface Evaluation {
  id: string;
  title: string;
  envelopeType: string;
  status: string;
  technicalWeight: string | null;
  commercialWeight: string | null;
  rfxEventId: string;
  createdAt: string;
  _count?: { criteria: number; assignments: number; scores: number };
}

interface PaginatedResponse {
  data: Evaluation[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

const ENVELOPE_KEYS: Record<string, string> = {
  SINGLE: 'envelopeSingle',
  DOUBLE: 'envelopeDouble',
  THREE_ENVELOPE: 'envelopeThree',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return formatDate(d);
}

export default function EvaluationsPage() {
  const t = useTranslations('evaluations');
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('pageSize', '20');
      const res = await api.get<PaginatedResponse>(`/evaluations?${params.toString()}`);
      setEvals(res.data);
      setTotal(res.meta.total);
    } catch { setEvals([]); }
    finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const draftCount = evals.filter((e) => e.status === 'DRAFT').length;
  const activeCount = evals.filter((e) => e.status === 'IN_PROGRESS').length;
  const completedCount = evals.filter((e) => e.status === 'COMPLETED').length;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50">
              <ClipboardCheck className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title', 'Evaluations')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('subtitle', 'Score and evaluate supplier bids with weighted criteria')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" /><span className="hidden sm:inline">{t('export', 'Export')}</span>
            </button>
            <Link href="/evaluations/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />{t('newEvaluation', 'New Evaluation')}
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('kpi.total', 'Total Evaluations'), value: total, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
          { label: t('kpi.active', 'In Progress'), value: activeCount, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
          { label: t('kpi.draft', 'Draft'), value: draftCount, labelColor: 'text-gray-500', valueColor: 'text-gray-500' },
          { label: t('kpi.completed', 'Completed'), value: completedCount, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
            <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder', 'Search evaluations...')}
            className="w-full ps-10 pe-4 py-2.5 text-[13.5px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-[42px] px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
          <option value="">{t('allStatuses', 'All Statuses')}</option>
          <option value="DRAFT">{t('status.draft', 'Draft')}</option>
          <option value="IN_PROGRESS">{t('status.inProgress', 'In Progress')}</option>
          <option value="COMPLETED">{t('status.completed', 'Completed')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin me-2" />{t('loading', 'Loading...')}
          </div>
        ) : evals.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">{t('noResults', 'No evaluations found')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('noResultsHint', 'Create your first evaluation to start scoring bids')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.title', 'Title')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.envelope', 'Envelope')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.status', 'Status')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.criteria', 'Criteria')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.evaluators', 'Evaluators')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('col.created', 'Created')}</th>
                <th className="px-5 py-3.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {evals.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900 max-w-[250px] truncate">{ev.title}</td>
                  <td className="px-5 py-4 text-gray-500 text-[13px]">{ENVELOPE_KEYS[ev.envelopeType] ? t(ENVELOPE_KEYS[ev.envelopeType]) : ev.envelopeType}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[ev.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ev.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-[13px]">
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{ev._count?.criteria ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-[13px]">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev._count?.assignments ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-[13px]">{fmt(ev.createdAt)}</td>
                  <td className="px-5 py-4">
                    <Link href={`/evaluations/${ev.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{t('showing', 'Showing')} {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} {t('of', 'of')} {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              {t('prev', 'Previous')}
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page * 20 >= total}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              {t('next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
