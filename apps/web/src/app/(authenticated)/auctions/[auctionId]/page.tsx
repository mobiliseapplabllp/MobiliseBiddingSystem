'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import CountdownTimer from '@/components/auction/countdown-timer';
import { LiveBidTicker } from '@/components/auction/live-bid-ticker';
import { BidHistoryChart } from '@/components/auction/bid-history-chart';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import {
  ArrowLeft, Gavel, Calendar, DollarSign, Tag, Clock, Users, TrendingDown,
  RefreshCw, Send, Lock, Play, Award, BarChart3, AlertCircle, Hash,
} from 'lucide-react';
import { formatDateTime, formatCurrency, formatTime } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuctionLineItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: string | null;
  uom: string | null;
  targetPrice: string | null;
}

interface AuctionLot {
  id: string;
  lotNumber: number;
  title: string;
  description: string | null;
  lineItems: AuctionLineItem[];
}

interface AuctionInvitation {
  id: string;
  supplierName: string;
  supplierEmail: string;
  status: string;
  respondedAt: string | null;
}

interface BidEntry {
  id: string;
  supplierName: string;
  amount: number;
  bidNumber: number;
  createdAt: string;
}

interface RankingEntry {
  rank: number;
  supplierName: string;
  bestPrice: number;
  totalBids: number;
  lastBidAt: string;
}

interface AuctionLiveData {
  totalBids: number;
  participatingSuppliers: number;
  bestPrice: number | null;
  extensions: number;
  rankings: RankingEntry[];
  recentBids: BidEntry[];
  endTime: string;
  isExtended: boolean;
}

interface Auction {
  id: string;
  refNumber: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  currency: string;
  reservePrice: string | null;
  startTime: string | null;
  endTime: string | null;
  extensionMinutes: number | null;
  extensionTriggerMinutes: number | null;
  createdAt: string;
  publishedAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  lots: AuctionLot[];
  invitations: AuctionInvitation[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-blue-50 text-blue-700',
  OPEN: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-amber-50 text-amber-700',
  EVALUATED: 'bg-purple-50 text-purple-700',
  AWARDED: 'bg-green-50 text-green-700',
};

function fmt(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  return formatDateTime(dateStr);
}

function fmtCurrency(value: number | string | null, currency: string) {
  if (value === null || value === undefined) return '\u2014';
  return formatCurrency(value, currency);
}

function fmtTime(dateStr: string) {
  return formatTime(dateStr);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuctionDetailPage() {
  const { auctionId } = useParams<{ auctionId: string }>();
  const t = useTranslations('auctionDetail');
  const tCommon = useTranslations('common');

  const [auction, setAuction] = useState<Auction | null>(null);
  const [liveData, setLiveData] = useState<AuctionLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  // Fetch auction detail
  useEffect(() => {
    if (!auctionId) return;
    api.get<Auction>(`/auctions/${auctionId}`)
      .then((a) => setAuction(a))
      .catch(() => setError(t('notFound')))
      .finally(() => setLoading(false));
  }, [auctionId, t]);

  // Poll live data when auction is OPEN (fallback if WebSocket disconnects)
  const fetchLiveData = useCallback(() => {
    if (!auctionId) return;
    api.get<AuctionLiveData>(`/auctions/${auctionId}/live`).then(setLiveData).catch(() => {});
  }, [auctionId]);

  useEffect(() => {
    if (auction?.status !== 'OPEN') return;
    fetchLiveData();
    // Reduced polling (10s) — WebSocket handles real-time; this is fallback only
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, [auction?.status, fetchLiveData]);

  // WebSocket real-time updates (primary for OPEN auctions)
  const { connected, recentBids, lastExtension } = useAuctionSocket({
    auctionId: auctionId ?? '',
    enabled: auction?.status === 'OPEN',
    onBidPlaced: () => fetchLiveData(),
    onExtended: () => fetchLiveData(),
    onClosed: () => { fetchAuction(); fetchLiveData(); },
  });

  // Status transitions
  const changeStatus = async (nextStatus: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setTransitioning(true);
    try {
      const updated = await api.patch<Auction>(`/auctions/${auctionId}/status`, { status: nextStatus });
      setAuction(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('statusChangeFailed'));
    } finally {
      setTransitioning(false);
    }
  };

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-secondary text-body">
        {tCommon('loading')}
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 bg-error/5 border border-error/20 rounded-lg p-5">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-error">{t('notFound')}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('notFoundHint')}</p>
          </div>
        </div>
        <Link href="/auctions" className="inline-flex items-center gap-2 mt-4 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('backToAuctions')}
        </Link>
      </div>
    );
  }

  const statusLabel = t(`status${auction.status.charAt(0) + auction.status.slice(1).toLowerCase()}`);

  // ─── Action buttons per status ────────────────────────────────────────────

  function renderActions() {
    switch (auction!.status) {
      case 'DRAFT':
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/auctions/${auction!.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-md text-text-secondary hover:bg-bg-surface-hover transition-colors"
            >
              {tCommon('edit')}
            </Link>
            <button
              onClick={() => changeStatus('PUBLISHED', t('confirmPublish'))}
              disabled={transitioning}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {t('publish')}
            </button>
            <button
              onClick={() => changeStatus('DELETED', t('confirmDelete'))}
              disabled={transitioning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-60"
            >
              {tCommon('delete')}
            </button>
          </div>
        );
      case 'PUBLISHED':
        return (
          <button
            onClick={() => changeStatus('OPEN', t('confirmOpen'))}
            disabled={transitioning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {t('openAuction')}
          </button>
        );
      case 'OPEN':
        return (
          <button
            onClick={() => changeStatus('CLOSED', t('confirmClose'))}
            disabled={transitioning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {t('closeAuction')}
          </button>
        );
      case 'CLOSED':
        return (
          <button
            onClick={() => changeStatus('EVALUATED', t('confirmEvaluate'))}
            disabled={transitioning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            <BarChart3 className="h-4 w-4" />
            {t('evaluate')}
          </button>
        );
      case 'EVALUATED':
        return (
          <button
            onClick={() => changeStatus('AWARDED', t('confirmAward'))}
            disabled={transitioning}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            <Award className="h-4 w-4" />
            {t('award')}
          </button>
        );
      default:
        return null;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl">
      {/* Back + header card */}
      <div className="mb-6">
        <Link href="/auctions" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />
          {t('backToAuctions')}
        </Link>

        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Gavel className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm font-semibold text-accent">{auction.refNumber}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[auction.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {statusLabel}
                  </span>
                </div>
                <h1 className="text-page-title text-text-primary">{auction.title}</h1>
              </div>
            </div>
            {renderActions()}
          </div>
        </div>
      </div>

      {/* ─── OPEN: Live auction view ─────────────────────────────────────────── */}
      {auction.status === 'OPEN' && (
        <div className="space-y-6">
          {/* Countdown */}
          <div className="bg-bg-surface border border-border rounded-lg p-8 flex flex-col items-center">
            <p className="text-sm font-medium text-text-secondary mb-3">{t('timeRemaining')}</p>
            <CountdownTimer
              endTime={liveData?.endTime ?? auction.endTime ?? new Date().toISOString()}
              isExtended={liveData?.isExtended}
              onExpired={fetchLiveData}
            />
          </div>

          {/* KPI row */}
          {liveData && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">{t('totalBids')}</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 tabular-nums">{liveData.totalBids}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600">{t('participatingSuppliers')}</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900 tabular-nums">{liveData.participatingSuppliers}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">{t('bestPrice')}</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 tabular-nums">
                  {liveData.bestPrice !== null ? fmtCurrency(liveData.bestPrice, auction.currency) : '\u2014'}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-600">{t('extensions')}</span>
                </div>
                <p className="text-2xl font-bold text-amber-900 tabular-nums">{liveData.extensions}</p>
              </div>
            </div>
          )}

          {/* Live ranking table */}
          {liveData && liveData.rankings.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sub-section text-text-primary">{t('liveRanking')}</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle">
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">#</th>
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('supplier')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bestPrice')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bids')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('lastBid')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {liveData.rankings.map((row) => (
                    <tr key={row.rank} className={row.rank === 1 ? 'bg-emerald-50/50' : ''}>
                      <td className="px-5 py-3 text-sm font-bold text-text-primary tabular-nums">{row.rank}</td>
                      <td className="px-5 py-3 text-sm text-text-primary font-medium">{row.supplierName}</td>
                      <td className="px-5 py-3 text-sm text-end font-semibold text-text-primary tabular-nums">
                        {fmtCurrency(row.bestPrice, auction.currency)}
                      </td>
                      <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{row.totalBids}</td>
                      <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{fmtTime(row.lastBidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Real-time components (WebSocket-powered) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sub-section text-text-primary">Live Bid Feed</h2>
                {connected && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <LiveBidTicker bids={recentBids} currency={auction.currency} />
            </div>
            <div className="bg-bg-surface border border-border rounded-lg p-5">
              <h2 className="text-sub-section text-text-primary mb-3">Bid Price Trend</h2>
              <BidHistoryChart
                bids={(liveData?.recentBids ?? []).map((b) => ({ bidPrice: b.amount, placedAt: b.createdAt }))}
                currency={auction.currency}
                height={260}
              />
            </div>
          </div>

          {/* Recent bid history table */}
          {liveData && liveData.recentBids.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sub-section text-text-primary">{t('recentBids')}</h2>
              </div>
              <div className="divide-y divide-border/50">
                {liveData.recentBids.map((bid) => (
                  <div key={bid.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-disabled">#{bid.bidNumber}</span>
                      <span className="text-sm font-medium text-text-primary">{bid.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-text-primary tabular-nums">
                        {fmtCurrency(bid.amount, auction.currency)}
                      </span>
                      <span className="text-xs text-text-secondary tabular-nums">{fmtTime(bid.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── DRAFT / PUBLISHED: Detail + lots + invitations ──────────────────── */}
      {(auction.status === 'DRAFT' || auction.status === 'PUBLISHED') && (
        <div className="space-y-6">
          {/* Detail card */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sub-section text-text-primary mb-4">{t('auctionDetails')}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-32 flex-shrink-0">{t('type')}</span>
                <span className="text-text-primary font-medium">{auction.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-32 flex-shrink-0">{t('currency')}</span>
                <span className="text-text-primary font-medium">{auction.currency}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-32 flex-shrink-0">{t('startTime')}</span>
                <span className="text-text-primary font-medium">{fmt(auction.startTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-32 flex-shrink-0">{t('endTime')}</span>
                <span className="text-text-primary font-medium">{fmt(auction.endTime)}</span>
              </div>
              {auction.reservePrice && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                  <span className="text-text-secondary w-32 flex-shrink-0">{t('reservePrice')}</span>
                  <span className="text-text-primary font-medium tabular-nums">
                    {fmtCurrency(auction.reservePrice, auction.currency)}
                  </span>
                </div>
              )}
              {auction.extensionMinutes && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                  <span className="text-text-secondary w-32 flex-shrink-0">{t('extensionConfig')}</span>
                  <span className="text-text-primary font-medium">
                    {t('extensionValue', { trigger: auction.extensionTriggerMinutes ?? 0, extend: auction.extensionMinutes })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lots & line items */}
          <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sub-section text-text-primary">{t('lotsAndLineItems')}</h2>
            </div>
            {auction.lots.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-secondary">
                {t('noLots')}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {auction.lots.map((lot) => (
                  <div key={lot.id} className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-text-disabled uppercase tracking-wide">
                        {t('lotNumber', { number: lot.lotNumber })}
                      </span>
                      <span className="text-sm font-semibold text-text-primary">{lot.title}</span>
                    </div>
                    {lot.lineItems.length > 0 && (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-start pb-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">#</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('description')}</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('qty')}</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('uom')}</th>
                            <th className="text-end pb-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('targetPrice')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {lot.lineItems.map((item) => (
                            <tr key={item.id} className="text-sm">
                              <td className="py-2 text-text-disabled text-xs">{item.itemNumber}</td>
                              <td className="py-2 ps-2 text-text-primary">{item.description}</td>
                              <td className="py-2 ps-2 text-text-secondary">{item.quantity ?? '\u2014'}</td>
                              <td className="py-2 ps-2 text-text-secondary">{item.uom ?? '\u2014'}</td>
                              <td className="py-2 text-end text-text-secondary">
                                {item.targetPrice ? fmtCurrency(item.targetPrice, auction.currency) : '\u2014'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invitations */}
          <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sub-section text-text-primary">{t('invitations')}</h2>
              {auction.status === 'DRAFT' && (
                <Link
                  href={`/auctions/${auction.id}/invitations`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                >
                  {t('inviteSupplier')}
                </Link>
              )}
            </div>
            {auction.invitations.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-secondary">
                {t('noInvitations')}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle">
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('supplier')}</th>
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('email')}</th>
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('inviteStatus')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('responded')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {auction.invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-5 py-3 text-sm font-medium text-text-primary">{inv.supplierName}</td>
                      <td className="px-5 py-3 text-sm text-text-secondary">{inv.supplierEmail}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          inv.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' :
                          inv.status === 'DECLINED' ? 'bg-red-50 text-red-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-end text-text-secondary">{fmt(inv.respondedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── CLOSED / EVALUATED / AWARDED: Final results ─────────────────────── */}
      {(auction.status === 'CLOSED' || auction.status === 'EVALUATED' || auction.status === 'AWARDED') && (
        <div className="space-y-6">
          {/* Final ranking table */}
          {liveData && liveData.rankings.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sub-section text-text-primary">{t('finalRanking')}</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-bg-subtle">
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">#</th>
                    <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('supplier')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bestPrice')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bids')}</th>
                    <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('lastBid')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {liveData.rankings.map((row) => (
                    <tr key={row.rank} className={row.rank === 1 ? 'bg-emerald-50/50' : ''}>
                      <td className="px-5 py-3 text-sm font-bold text-text-primary tabular-nums">{row.rank}</td>
                      <td className="px-5 py-3 text-sm text-text-primary font-medium">{row.supplierName}</td>
                      <td className="px-5 py-3 text-sm text-end font-semibold text-text-primary tabular-nums">
                        {fmtCurrency(row.bestPrice, auction.currency)}
                      </td>
                      <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{row.totalBids}</td>
                      <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{fmtTime(row.lastBidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bid history */}
          {liveData && liveData.recentBids.length > 0 && (
            <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sub-section text-text-primary">{t('bidHistory')}</h2>
              </div>
              <div className="divide-y divide-border/50">
                {liveData.recentBids.map((bid) => (
                  <div key={bid.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-disabled">#{bid.bidNumber}</span>
                      <span className="text-sm font-medium text-text-primary">{bid.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-text-primary tabular-nums">
                        {fmtCurrency(bid.amount, auction.currency)}
                      </span>
                      <span className="text-xs text-text-secondary tabular-nums">{fmtTime(bid.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load final results if not already loaded */}
          {!liveData && (
            <FinalResultsLoader auctionId={auction.id} currency={auction.currency} t={t} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Final Results Loader (for CLOSED/EVALUATED/AWARDED when liveData not populated) ──

function FinalResultsLoader({
  auctionId,
  currency,
  t,
}: {
  auctionId: string;
  currency: string;
  t: (key: string) => string;
}) {
  const [data, setData] = useState<AuctionLiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuctionLiveData>(`/auctions/${auctionId}/live`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary text-sm">
        {t('loadingResults')}
      </div>
    );
  }

  if (!data || (data.rankings.length === 0 && data.recentBids.length === 0)) {
    return (
      <div className="bg-bg-surface border border-border rounded-lg p-10 text-center text-sm text-text-secondary">
        {t('noResults')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.rankings.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sub-section text-text-primary">{t('finalRanking')}</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">#</th>
                <th className="text-start px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('supplier')}</th>
                <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bestPrice')}</th>
                <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('bids')}</th>
                <th className="text-end px-5 py-3 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">{t('lastBid')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.rankings.map((row) => (
                <tr key={row.rank} className={row.rank === 1 ? 'bg-emerald-50/50' : ''}>
                  <td className="px-5 py-3 text-sm font-bold text-text-primary tabular-nums">{row.rank}</td>
                  <td className="px-5 py-3 text-sm text-text-primary font-medium">{row.supplierName}</td>
                  <td className="px-5 py-3 text-sm text-end font-semibold text-text-primary tabular-nums">
                    {fmtCurrency(row.bestPrice, currency)}
                  </td>
                  <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{row.totalBids}</td>
                  <td className="px-5 py-3 text-sm text-end text-text-secondary tabular-nums">{fmtTime(row.lastBidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.recentBids.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sub-section text-text-primary">{t('bidHistory')}</h2>
          </div>
          <div className="divide-y divide-border/50">
            {data.recentBids.map((bid) => (
              <div key={bid.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-disabled">#{bid.bidNumber}</span>
                  <span className="text-sm font-medium text-text-primary">{bid.supplierName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-text-primary tabular-nums">
                    {fmtCurrency(bid.amount, currency)}
                  </span>
                  <span className="text-xs text-text-secondary tabular-nums">{fmtTime(bid.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
