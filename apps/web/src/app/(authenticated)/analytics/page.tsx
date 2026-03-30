'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Gavel,
  PieChart,
  Minus,
} from 'lucide-react';

interface DashboardData {
  totalSpend: number;
  totalSavings: number;
  savingsPercent: number;
  activeEvents: number;
  totalBids: number;
  avgBidsPerEvent: number;
  auctionParticipation: number;
  supplierResponseRate: number;
  eventsByStatus: Record<string, number>;
  spendByCategory: Array<{ category: string; amount: number }>;
  monthlyTrend: Array<{ month: string; spend: number; savings: number }>;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-error" />;
  return <Minus className="h-3 w-3 text-text-muted" />;
}

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await api.get<DashboardData>('/analytics/dashboard');
      setData(res);
    } catch {
      // API unavailable — show zeros, not fake data
      setData({
        totalSpend: 0, totalSavings: 0, savingsPercent: 0,
        activeEvents: 0, totalBids: 0, avgBidsPerEvent: 0,
        auctionParticipation: 0, supplierResponseRate: 0,
        eventsByStatus: {},
        spendByCategory: [],
        monthlyTrend: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }

  if (loading) {
    return (
      <div className="max-w-7xl flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-text-muted">{t('loading', 'Loading analytics...')}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: t('kpi.totalSpend', 'Total Spend'),
      value: formatCurrency(data.totalSpend),
      change: t('kpi.last6Months', 'Last 6 months'),
      trend: 'neutral' as const,
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      accentColor: '#2563EB',
    },
    {
      title: t('kpi.totalSavings', 'Total Savings'),
      value: formatCurrency(data.totalSavings),
      change: `${data.savingsPercent}% ${t('kpi.vsBudget', 'vs. budget')}`,
      trend: 'up' as const,
      icon: TrendingDown,
      color: 'text-success',
      bgColor: 'bg-success/10',
      accentColor: '#059669',
    },
    {
      title: t('kpi.activeEvents', 'Active Events'),
      value: String(data.activeEvents),
      change: `${data.totalBids} ${t('kpi.totalBids', 'total bids')}`,
      trend: 'up' as const,
      icon: FileText,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      accentColor: '#7C3AED',
    },
    {
      title: t('kpi.supplierResponse', 'Supplier Response'),
      value: `${data.supplierResponseRate}%`,
      change: t('kpi.responseRate', 'response rate'),
      trend: 'up' as const,
      icon: Users,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      accentColor: '#E11D48',
    },
  ];

  const maxSpend = Math.max(...data.spendByCategory.map((c) => c.amount));
  const categoryColors = ['bg-accent', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const maxMonthlySpend = Math.max(...data.monthlyTrend.map((m) => m.spend));

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-page-title text-text-primary">{t('title', 'Analytics')}</h1>
            <p className="text-text-muted text-body mt-0.5">
              {t('subtitle', 'Procurement spend, savings, and performance insights')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi) => (
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
            <p className="text-text-muted text-[12px] flex items-center gap-1.5">
              <TrendIcon trend={kpi.trend} />
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Spend by Category */}
        <div className="bg-bg-surface border border-border rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <PieChart className="h-4 w-4 text-text-muted" />
            <h2 className="text-sub-section text-text-primary">{t('spendByCategory', 'Spend by Category')}</h2>
          </div>
          <div className="p-5 space-y-3">
            {data.spendByCategory.map((cat, i) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary">{cat.category}</span>
                  <span className="text-sm font-mono text-text-muted">{formatCurrency(cat.amount)}</span>
                </div>
                <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${categoryColors[i % categoryColors.length]} transition-all duration-500`}
                    style={{ width: `${(cat.amount / maxSpend) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events by Status */}
        <div className="bg-bg-surface border border-border rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            <h2 className="text-sub-section text-text-primary">{t('eventsByStatus', 'Events by Status')}</h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(data.eventsByStatus).map(([status, count]) => {
              const total = Object.values(data.eventsByStatus).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm text-text-primary w-28">{status.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-2 bg-bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-text-muted w-12 text-end">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Spend Trend (bar chart) */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <h2 className="text-sub-section text-text-primary">{t('monthlyTrend', 'Monthly Spend Trend')}</h2>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-2 h-48">
            {data.monthlyTrend.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: '160px' }}>
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-5 bg-accent/80 rounded-t transition-all duration-500"
                      style={{ height: `${(month.spend / maxMonthlySpend) * 100}%` }}
                      title={`${t('spend', 'Spend')}: ${formatCurrency(month.spend)}`}
                    />
                    <div
                      className="w-5 bg-emerald-500/80 rounded-t transition-all duration-500"
                      style={{ height: `${(month.savings / maxMonthlySpend) * 100}%` }}
                      title={`${t('savings', 'Savings')}: ${formatCurrency(month.savings)}`}
                    />
                  </div>
                </div>
                <span className="text-[11px] text-text-muted">{month.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-accent/80" />
              <span className="text-xs text-text-muted">{t('spend', 'Spend')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-emerald-500/80" />
              <span className="text-xs text-text-muted">{t('savings', 'Savings')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
