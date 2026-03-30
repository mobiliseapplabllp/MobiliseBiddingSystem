'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime, formatCurrency } from '@/lib/format';

interface BidLineItem {
  id: string;
  description: string;
  quantity: string | null;
  uom: string | null;
  unitPrice: string | null;
  totalPrice: string | null;
  notes: string | null;
}

interface Bid {
  id: string;
  supplierId: string;
  status: string;
  totalPrice: string | null;
  currency: string;
  notes: string | null;
  submittedAt: string | null;
  version: number;
  lineItems: BidLineItem[];
}

interface EventInfo {
  id: string;
  refNumber: string;
  title: string;
  currency: string;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:     'bg-blue-50 text-blue-700',
  WITHDRAWN:     'bg-slate-100 text-slate-500',
  DISQUALIFIED:  'bg-red-50 text-red-600',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return formatDateTime(d);
}

function fmtCurrency(v: string | null, currency: string) {
  if (!v) return '—';
  return formatCurrency(v, currency);
}

export default function BidsPage() {
  const t = useTranslations('events');
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<EventInfo>(`/rfx-events/${eventId}`),
      api.get<Bid[]>(`/rfx-events/${eventId}/bids`),
    ])
      .then(([evt, b]) => {
        setEvent(evt);
        setBids(b);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-text-secondary text-sm">{t('loading', 'Loading...')}</div>;
  }

  // Sort by total price ascending for comparison
  const sorted = [...bids].sort((a, b) => {
    const pa = a.totalPrice ? Number(a.totalPrice) : Infinity;
    const pb = b.totalPrice ? Number(b.totalPrice) : Infinity;
    return pa - pb;
  });

  const currency = event?.currency ?? 'USD';

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToEvent', 'Back to Event')}
        </Link>
        <p className="text-caption text-text-muted font-mono mb-0.5">{event?.refNumber}</p>
        <h1 className="text-page-title text-text-primary">{t('bidSubmissions', 'Bid Submissions')}</h1>
        <p className="text-body text-text-muted">{event?.title}</p>
      </div>

      {bids.length === 0 ? (
        <div className="bg-bg-surface rounded-lg border border-border py-16 text-center">
          <Package className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sub-section text-text-primary mb-1">{t('noBidsYet', 'No bids received yet')}</p>
          <p className="text-body text-text-muted">{t('noBidsDescription', 'Submitted bids from invited suppliers will appear here.')}</p>
          <Link href={`/events/${eventId}/invitations`} className="inline-flex items-center gap-1 mt-4 text-sm text-accent hover:underline">
            {t('manageInvitations', 'Manage Invitations')} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-text-muted">
            {bids.length} bid{bids.length !== 1 ? 's' : ''} received — sorted by price (lowest first)
          </div>
          {sorted.map((bid, rank) => {
            const isExpanded = expanded === bid.id;
            return (
              <div key={bid.id} className="bg-bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-bg-subtle transition-colors text-start"
                  onClick={() => setExpanded(isExpanded ? null : bid.id)}
                >
                  {/* Rank badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    rank === 0 ? 'bg-amber-400 text-white' :
                    rank === 1 ? 'bg-slate-300 text-slate-700' :
                    rank === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {rank + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-text-primary text-sm">
                        Supplier ID: {bid.supplierId || 'Anonymous'}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[bid.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {bid.status}
                      </span>
                      {bid.version > 1 && (
                        <span className="text-xs text-text-muted">v{bid.version}</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">
                      Submitted: {fmt(bid.submittedAt)} · {bid.lineItems.length} line item{bid.lineItems.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="text-end flex-shrink-0">
                    <div className="text-base font-bold tabular-nums text-text-primary">
                      {fmtCurrency(bid.totalPrice, currency)}
                    </div>
                    <div className="text-xs text-text-muted">{currency}</div>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4">
                    {bid.notes && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <p className="text-xs font-medium text-blue-700 mb-1">Supplier Notes:</p>
                        <p className="text-sm text-blue-800">{bid.notes}</p>
                      </div>
                    )}

                    {bid.lineItems.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-text-muted">
                            <th className="text-start pb-2 font-medium">{t('description', 'Description')}</th>
                            <th className="text-end pb-2 font-medium w-16">{t('qty', 'Qty')}</th>
                            <th className="text-end pb-2 font-medium w-16">{t('uom', 'UOM')}</th>
                            <th className="text-end pb-2 font-medium w-28">{t('unitPrice', 'Unit Price')}</th>
                            <th className="text-end pb-2 font-medium w-28">{t('lineTotal', 'Line Total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bid.lineItems.map(li => (
                            <tr key={li.id} className="border-b border-border/50 last:border-0">
                              <td className="py-2 text-text-primary">{li.description}</td>
                              <td className="py-2 text-end text-text-secondary tabular-nums">{li.quantity ?? '—'}</td>
                              <td className="py-2 text-end text-text-secondary">{li.uom ?? '—'}</td>
                              <td className="py-2 text-end text-text-secondary tabular-nums">
                                {li.unitPrice ? fmtCurrency(li.unitPrice, currency) : '—'}
                              </td>
                              <td className="py-2 text-end text-text-primary font-medium tabular-nums">
                                {li.totalPrice ? fmtCurrency(li.totalPrice, currency) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
