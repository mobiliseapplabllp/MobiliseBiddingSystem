'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { api } from '@/lib/api-client';
import { CountdownTimer } from '@/components/auction/countdown-timer';
import { LiveBidTicker } from '@/components/auction/live-bid-ticker';
import { BidHistoryChart } from '@/components/auction/bid-history-chart';
import { useAuctionSocket, type BidPlacedEvent } from '@/hooks/useAuctionSocket';
import {
  Gavel, TrendingDown, Trophy, Hash, Clock, Users, Shield,
  Loader2, AlertCircle, CheckCircle, Zap, ArrowDown,
} from 'lucide-react';
import { formatNumber, formatDateTime } from '@/lib/format';

interface SupplierLiveState {
  auctionId: string;
  title: string;
  refNumber: string;
  status: string;
  currency: string;
  auctionType: string;
  bidVisibility: string;
  endAt: string | null;
  timeRemaining: number | null;
  totalBids: number;
  totalParticipants: number;
  extensionCount: number;
  myRank: number | null;
  myBestPrice: number | null;
  myBidCount: number;
  myBids: Array<{ id: string; bidPrice: number; placedAt: string; rank: number | null; bidNumber: number }>;
}

interface ProxyBidState {
  id: string;
  minPrice: number;
  decrementStep: number;
  isActive: boolean;
  totalBidsPlaced: number;
}

export default function SupplierAuctionPage() {
  const t = useTranslations('auctionSupplier');
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : (params.token ?? '');

  const [liveState, setLiveState] = useState<SupplierLiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bid form
  const [bidPrice, setBidPrice] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  // Proxy bid
  const [proxyBid, setProxyBid] = useState<ProxyBidState | null>(null);
  const [showProxy, setShowProxy] = useState(false);
  const [proxyMin, setProxyMin] = useState('');
  const [proxyStep, setProxyStep] = useState('');
  const [savingProxy, setSavingProxy] = useState(false);

  // Fetch live state
  const fetchLive = useCallback(async () => {
    try {
      const data = await api.get<SupplierLiveState>(`/auction-bids/live?token=${token}`);
      setLiveState(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  // Fetch proxy bid status
  useEffect(() => {
    if (!token) return;
    api.get<ProxyBidState | null>(`/auction-bids/proxy?token=${token}`)
      .then(setProxyBid)
      .catch(() => {});
  }, [token]);

  // WebSocket for real-time updates
  const { connected, recentBids, lastExtension } = useAuctionSocket({
    auctionId: liveState?.auctionId ?? '',
    enabled: liveState?.status === 'OPEN',
    onBidPlaced: () => fetchLive(), // Refresh state on any bid
    onExtended: () => fetchLive(),
    onClosed: () => fetchLive(),
  });

  // Place bid
  const handlePlaceBid = async () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) { setBidError(t('enterValidPrice')); return; }

    setBidding(true);
    setBidError('');
    setBidSuccess('');
    try {
      const result = await api.post<{ id: string; rank: number | null }>('/auction-bids/place', {
        bidPrice: price,
        invitationToken: token,
      });
      setBidSuccess(t('bidPlacedSuccess', { rank: String(result.rank ?? '—') }));
      setBidPrice('');
      await fetchLive();
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Bid failed');
    } finally {
      setBidding(false);
    }
  };

  // Save proxy bid
  const handleSaveProxy = async () => {
    const min = parseFloat(proxyMin);
    const step = parseFloat(proxyStep);
    if (isNaN(min) || min <= 0) return;
    if (isNaN(step) || step <= 0) return;

    setSavingProxy(true);
    try {
      const result = await api.post<ProxyBidState>('/auction-bids/proxy', {
        minPrice: min, decrementStep: step, invitationToken: token,
      });
      setProxyBid(result);
      setShowProxy(false);
    } catch { /* */ }
    finally { setSavingProxy(false); }
  };

  const handleCancelProxy = async () => {
    await api.delete(`/auction-bids/proxy?token=${token}`);
    setProxyBid(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !liveState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">{t('auctionNotAvailable')}</h2>
          <p className="text-sm text-gray-500">{error || t('invalidOrExpired')}</p>
        </div>
      </div>
    );
  }

  const isOpen = liveState.status === 'OPEN';
  const isClosed = liveState.status === 'CLOSED' || liveState.status === 'EVALUATED' || liveState.status === 'AWARDED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
              <Gavel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{liveState.title}</h1>
              <p className="text-xs text-gray-500">{liveState.refNumber} · {liveState.auctionType} · {liveState.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('live')}
              </span>
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isOpen ? 'bg-emerald-50 text-emerald-700' :
              isClosed ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
            }`}>
              {liveState.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Countdown + My Rank */}
        {isOpen && liveState.endAt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('timeRemaining')}</p>
              <CountdownTimer
                endTime={liveState.endAt}
                isExtended={(liveState.extensionCount ?? 0) > 0}
                onExpired={fetchLive}
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('yourCurrentRank')}</p>
              <p className={`text-[48px] font-bold font-mono leading-none ${
                liveState.myRank === 1 ? 'text-emerald-600' :
                liveState.myRank && liveState.myRank <= 3 ? 'text-blue-600' : 'text-gray-800'
              }`}>
                {liveState.myRank ? `#${liveState.myRank}` : '—'}
              </p>
              {liveState.myRank === 1 && (
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3" /> {t('leading')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('myBestPrice'), value: liveState.myBestPrice ? `${liveState.currency} ${formatNumber(liveState.myBestPrice)}` : '—', icon: TrendingDown, color: 'text-blue-600' },
            { label: t('myBids'), value: String(liveState.myBidCount), icon: Hash, color: 'text-violet-600' },
            { label: t('totalBids'), value: String(liveState.totalBids), icon: Gavel, color: 'text-amber-600' },
            { label: t('participants'), value: String(liveState.totalParticipants), icon: Users, color: 'text-emerald-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-[11px] font-medium text-gray-500">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Place Bid Form */}
        {isOpen && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-blue-600" />
              {t('placeYourBid')}
            </h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('bidAmount', { currency: liveState.currency })}
                  {liveState.myBestPrice && (
                    <span className="text-gray-400 ms-2">{t('currentBest', { amount: formatNumber(liveState.myBestPrice) })}</span>
                  )}
                </label>
                <input
                  type="number"
                  value={bidPrice}
                  onChange={(e) => { setBidPrice(e.target.value); setBidError(''); setBidSuccess(''); }}
                  placeholder={t('enterBidAmount')}
                  className="w-full h-[46px] px-4 rounded-lg border border-gray-200 bg-gray-50 text-lg font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handlePlaceBid()}
                />
              </div>
              <button
                onClick={handlePlaceBid}
                disabled={bidding || !bidPrice}
                className="h-[46px] px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-50"
                style={{ background: bidding ? '#93C5FD' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
              >
                {bidding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                {bidding ? t('placingBid') : t('placeBid')}
              </button>
            </div>
            {bidError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {bidError}
              </div>
            )}
            {bidSuccess && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] rounded-lg px-4 py-2.5 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" /> {bidSuccess}
              </div>
            )}
          </div>
        )}

        {/* Proxy Bidding */}
        {isOpen && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> {t('autoBidProxy')}
              </h3>
              {proxyBid?.isActive ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                    Active — min {liveState.currency} {formatNumber(proxyBid.minPrice)}, step {formatNumber(proxyBid.decrementStep)}
                  </span>
                  <button onClick={handleCancelProxy} className="text-xs text-red-600 hover:text-red-700 font-medium">{t('proxyCancel')}</button>
                </div>
              ) : (
                <button onClick={() => setShowProxy(!showProxy)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {showProxy ? t('proxyHide') : t('proxySetUp')}
                </button>
              )}
            </div>
            {!proxyBid?.isActive && showProxy && (
              <div className="flex items-end gap-3 mt-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('minimumPrice')}</label>
                  <input type="number" value={proxyMin} onChange={(e) => setProxyMin(e.target.value)}
                    placeholder={t('lowestYouWillGo')} className="w-full h-[38px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('decrementStep')}</label>
                  <input type="number" value={proxyStep} onChange={(e) => setProxyStep(e.target.value)}
                    placeholder={t('autoDecreaseBy')} className="w-full h-[38px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <button onClick={handleSaveProxy} disabled={savingProxy}
                  className="h-[38px] px-4 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors">
                  {savingProxy ? t('savingProxy') : t('activateProxy')}
                </button>
              </div>
            )}
            {!proxyBid?.isActive && !showProxy && (
              <p className="text-xs text-gray-400">{t('proxyDescription')}</p>
            )}
          </div>
        )}

        {/* Live Bid Ticker (WebSocket) */}
        {isOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('liveBidFeed')}</h3>
              <LiveBidTicker bids={recentBids} currency={liveState.currency} />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('bidHistory')}</h3>
              <BidHistoryChart
                bids={liveState.myBids.map((b) => ({ bidPrice: Number(b.bidPrice), placedAt: b.placedAt }))}
                currency={liveState.currency}
                height={240}
              />
            </div>
          </div>
        )}

        {/* My Bid History Table */}
        {liveState.myBids.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">{t('yourBidHistory')}</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-start text-[12px] font-semibold text-gray-500">#</th>
                  <th className="px-5 py-3 text-start text-[12px] font-semibold text-gray-500">{t('price')}</th>
                  <th className="px-5 py-3 text-start text-[12px] font-semibold text-gray-500">{t('rank')}</th>
                  <th className="px-5 py-3 text-start text-[12px] font-semibold text-gray-500">{t('time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liveState.myBids.map((bid) => (
                  <tr key={bid.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 text-gray-400">{bid.bidNumber}</td>
                    <td className="px-5 py-3 font-mono font-medium text-gray-900">
                      {liveState.currency} {formatNumber(bid.bidPrice)}
                    </td>
                    <td className="px-5 py-3">
                      {bid.rank && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          bid.rank === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          #{bid.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {formatDateTime(bid.placedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Closed state */}
        {isClosed && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('auctionStatus', { status: liveState.status.toLowerCase() })}</h2>
            <p className="text-sm text-gray-500">
              {liveState.myRank === 1
                ? t('winningBidder')
                : t('finalRank', { rank: String(liveState.myRank ?? '—'), currency: liveState.currency, price: liveState.myBestPrice ? formatNumber(liveState.myBestPrice) : '—' })
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
