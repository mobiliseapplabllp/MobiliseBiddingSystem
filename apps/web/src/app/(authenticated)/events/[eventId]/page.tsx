'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  ArrowLeft, FileText, Calendar, DollarSign, Tag,
  ChevronRight, AlertCircle, CheckCircle2, Layers, Send, X, Lock, Circle,
  Gavel, Play, Square, Loader2,
} from 'lucide-react';
import { AuctionRulesDisplay } from '@/components/auction/auction-rules-display';
import { formatDateTime, formatCurrency } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: string | null;
  uom: string | null;
  targetPrice: string | null;
  notes: string | null;
}

interface Lot {
  id: string;
  lotNumber: number;
  title: string;
  description: string | null;
  currency: string | null;
  estimatedValue: string | null;
  lineItems: LineItem[];
}

interface RfxEvent {
  id: string;
  refNumber: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  currency: string;
  estimatedValue: string | null;
  submissionDeadline: string | null;
  clarificationDeadline: string | null;
  internalRef: string | null;
  auctionConfig: Record<string, unknown> | null;
  hasAuctionPhase: boolean;
  auctionStatus: string | null;
  auctionStartAt: string | null;
  auctionEndAt: string | null;
  createdById: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  lots: Lot[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  DRAFT: 'Draft', PUBLISHED: 'Published', AUCTION_OPEN: 'Auction Open',
  CLOSED: 'Closed', IN_EVALUATION: 'In Evaluation', CANCELLED: 'Cancelled', AWARDED: 'Awarded',
};

const AUCTION_EVENT_TYPES = ['REVERSE_AUCTION', 'DUTCH_AUCTION', 'JAPANESE_AUCTION'];

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return formatDateTime(dateStr);
}

function fmtCurrency(value: string | null, currency: string) {
  if (!value) return '—';
  return formatCurrency(value, currency);
}

// ─── Status Action Buttons ────────────────────────────────────────────────────

function getTransitionActions(t: (key: string, fallback?: string) => string): Record<string, { label: string; next: string; icon: typeof Send; color: string; confirm: string }[]> {
  return {
    DRAFT: [
      { label: t('detail.publish', 'Publish'), next: 'PUBLISHED', icon: Send, color: 'bg-accent text-white hover:bg-accent/90', confirm: t('detail.confirmPublish', 'Publish this event? It will be visible to invited suppliers.') },
      { label: t('detail.cancel', 'Cancel'), next: 'CANCELLED', icon: X, color: 'bg-error/10 text-error hover:bg-error/20', confirm: t('detail.confirmCancel', 'Cancel this event? This cannot be undone.') },
    ],
    PUBLISHED: [
      { label: t('detail.close', 'Close'), next: 'CLOSED', icon: Lock, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100', confirm: t('detail.confirmClose', 'Close this event? No further responses will be accepted.') },
      { label: t('detail.cancel', 'Cancel'), next: 'CANCELLED', icon: X, color: 'bg-error/10 text-error hover:bg-error/20', confirm: t('detail.confirmCancel', 'Cancel this event? This cannot be undone.') },
    ],
    CLOSED: [
      { label: t('detail.award', 'Award'), next: 'AWARDED', icon: CheckCircle2, color: 'bg-success text-white hover:bg-success/90', confirm: t('detail.confirmAward', 'Mark this event as Awarded?') },
    ],
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Publish Checklist Modal ──────────────────────────────────────────────────

interface CheckItem {
  label: string;
  passed: boolean;
  hint: string;
}

function PublishChecklistModal({
  event,
  onConfirm,
  onCancel,
  loading,
  t,
}: {
  event: RfxEvent;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  t: (key: string, fallback?: string) => string;
}) {
  const checks: CheckItem[] = [
    {
      label: t('publishChecklist.hasTitle', 'Event has a title'),
      passed: !!event.title?.trim(),
      hint: t('publishChecklist.hasTitleHint', 'Add a descriptive title to the event.'),
    },
    {
      label: t('publishChecklist.hasDeadline', 'Submission deadline is set'),
      passed: !!event.submissionDeadline,
      hint: t('publishChecklist.hasDeadlineHint', 'Set a submission deadline so suppliers know when to respond by.'),
    },
    {
      label: t('publishChecklist.deadlineFuture', 'Submission deadline is in the future'),
      passed: !!event.submissionDeadline && new Date(event.submissionDeadline) > new Date(),
      hint: t('publishChecklist.deadlineFutureHint', 'The submission deadline must be a future date.'),
    },
    {
      label: t('publishChecklist.hasLots', 'At least one lot or scope defined'),
      passed: event.lots.length > 0,
      hint: t('publishChecklist.hasLotsHint', 'Add at least one lot to define the procurement scope.'),
    },
  ];

  const allPassed = checks.every(c => c.passed);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface rounded-lg border border-border p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-sub-section text-text-primary">{t('publishChecklist.title', 'Publish Event')}</h2>
        </div>
        <p className="text-sm text-text-muted mb-5">
          {t('publishChecklist.description', 'Publishing will make this event visible to invited suppliers. Please review the checklist below.')}
        </p>

        <div className="space-y-3 mb-6">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3">
              {check.passed
                ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
              }
              <div>
                <span className={`text-sm font-medium ${check.passed ? 'text-text-primary' : 'text-text-muted'}`}>
                  {check.label}
                </span>
                {!check.passed && (
                  <p className="text-xs text-amber-600 mt-0.5">{check.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!allPassed && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {t('publishChecklist.warningNotAllPassed', 'Some checks have not passed. You can still publish, but it is recommended to resolve the issues above first.')}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? t('publishChecklist.publishing', 'Publishing...') : t('publishChecklist.publishNow', 'Publish Now')}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-border text-text-secondary rounded-md font-medium text-sm hover:bg-bg-subtle"
          >
            {t('detail.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const t = useTranslations('events');
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<RfxEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    api.get<RfxEvent>(`/rfx-events/${eventId}`)
      .then((e) => setEvent(e))
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [eventId]);

  const changeStatus = async (next: string, confirm: string) => {
    // Publish uses the checklist modal instead of window.confirm
    if (next === 'PUBLISHED') {
      setShowPublishModal(true);
      return;
    }
    if (!window.confirm(confirm)) return;
    setTransitioning(true);
    try {
      const updated = await api.patch<RfxEvent>(`/rfx-events/${eventId}/status`, { status: next });
      setEvent(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Status change failed');
    } finally {
      setTransitioning(false);
    }
  };

  const confirmPublish = async () => {
    setTransitioning(true);
    try {
      const updated = await api.patch<RfxEvent>(`/rfx-events/${eventId}/status`, { status: 'PUBLISHED' });
      setEvent(updated);
      setShowPublishModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to publish event');
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-secondary text-body">
        {t('loadingEvent', 'Loading event...')}
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 bg-error/5 border border-error/20 rounded-lg p-5">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-error">{t('eventNotFound', 'Event not found')}</p>
            <p className="text-xs text-text-secondary mt-0.5">{t('eventNotFoundDesc', 'The event may have been deleted or you may not have access.')}</p>
          </div>
        </div>
        <Link href="/events" className="inline-flex items-center gap-2 mt-4 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t('backToEvents', 'Back to Events')}
        </Link>
      </div>
    );
  }

  const actions = getTransitionActions(t)[event.status] ?? [];

  return (
    <div className="max-w-5xl">
      {/* Publish checklist modal */}
      {showPublishModal && event && (
        <PublishChecklistModal
          event={event}
          onConfirm={confirmPublish}
          onCancel={() => setShowPublishModal(false)}
          loading={transitioning}
          t={t}
        />
      )}

      {/* Back + header */}
      <div className="mb-6">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />
          {t('backToEvents', 'Back to Events')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm font-semibold text-accent">{event.refNumber}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[event.status] ?? ''}`}>
                {STATUS_LABELS[event.status] ?? event.status}
              </span>
              <span className="text-xs font-semibold text-text-secondary bg-bg-surface-hover px-2 py-0.5 rounded">
                {event.type}
              </span>
            </div>
            <h1 className="text-page-title text-text-primary">{event.title}</h1>
          </div>

          {/* Action buttons */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {event.status === 'DRAFT' && (
                <Link
                  href={`/events/${event.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-md text-text-secondary hover:bg-bg-surface-hover transition-colors"
                >
                  Edit
                </Link>
              )}
              {actions.map((action) => (
                <button
                  key={action.next}
                  onClick={() => changeStatus(action.next, action.confirm)}
                  disabled={transitioning}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 ${action.color}`}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="col-span-2 space-y-5">
          {/* Description */}
          {event.description && (
            <div className="bg-bg-surface border border-border rounded-lg p-5">
              <h2 className="text-sub-section text-text-primary flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-text-secondary" />
                {t('description', 'Description')}
              </h2>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Lots & Line Items */}
          <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sub-section text-text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-text-secondary" />
                {t('lotsLineItems', 'Lots & Line Items')}
              </h2>
              {event.status === 'DRAFT' && (
                <Link
                  href={`/events/${event.id}/lots/add`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  + Add Lot
                </Link>
              )}
            </div>

            {event.lots.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-secondary">
                No lots defined. {event.status === 'DRAFT' && 'Add lots to define the scope for suppliers.'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {event.lots.map((lot) => (
                  <div key={lot.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs font-bold text-text-disabled uppercase tracking-wide me-2">
                          Lot {lot.lotNumber}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">{lot.title}</span>
                      </div>
                      {lot.estimatedValue && (
                        <span className="text-xs font-medium text-text-secondary">
                          {fmtCurrency(lot.estimatedValue, lot.currency || event.currency)}
                        </span>
                      )}
                    </div>

                    {lot.lineItems.length > 0 && (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-start pb-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">#</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">Description</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">Qty</th>
                            <th className="text-start pb-2 ps-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">UOM</th>
                            <th className="text-end pb-2 text-[11px] text-text-disabled font-semibold uppercase tracking-wide">Target</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {lot.lineItems.map((item) => (
                            <tr key={item.id} className="text-sm">
                              <td className="py-2 text-text-disabled text-xs">{item.itemNumber}</td>
                              <td className="py-2 ps-2 text-text-primary">{item.description}</td>
                              <td className="py-2 ps-2 text-text-secondary">{item.quantity ?? '—'}</td>
                              <td className="py-2 ps-2 text-text-secondary">{item.uom ?? '—'}</td>
                              <td className="py-2 text-end text-text-secondary">
                                {item.targetPrice ? fmtCurrency(item.targetPrice, lot.currency || event.currency) : '—'}
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
        </div>

        {/* Right — metadata sidebar */}
        <div className="space-y-5">
          {/* Key details */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">{t('eventDetails', 'Event Details')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-24 flex-shrink-0">Type</span>
                <span className="text-text-primary font-medium">{event.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                <span className="text-text-secondary w-24 flex-shrink-0">Currency</span>
                <span className="text-text-primary font-medium">{event.currency}</span>
              </div>
              {event.estimatedValue && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                  <span className="text-text-secondary w-24 flex-shrink-0">Est. Value</span>
                  <span className="text-text-primary font-medium tabular-nums">
                    {fmtCurrency(event.estimatedValue, event.currency)}
                  </span>
                </div>
              )}
              {event.internalRef && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-text-disabled flex-shrink-0" />
                  <span className="text-text-secondary w-24 flex-shrink-0">Internal Ref</span>
                  <span className="text-text-primary font-medium">{event.internalRef}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">{t('keyDates', 'Key Dates')}</h3>
            <div className="space-y-3">
              {[
                { label: 'Clarification', value: event.clarificationDeadline },
                { label: 'Submission', value: event.submissionDeadline },
                { label: 'Published', value: event.publishedAt },
                { label: 'Closed', value: event.closedAt },
                { label: 'Created', value: event.createdAt },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-text-disabled flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-secondary text-xs block">{label}</span>
                    <span className="text-text-primary font-medium text-xs">{fmt(value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auction Phase (for auction-type events) */}
          {(event.hasAuctionPhase || AUCTION_EVENT_TYPES.includes(event.type)) && (
            <div className="bg-bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-text-primary">Auction Phase</h3>
              </div>

              {event.auctionConfig && (
                <AuctionRulesDisplay config={event.auctionConfig as any} compact />
              )}

              {event.status === 'PUBLISHED' && event.hasAuctionPhase && (
                <button
                  onClick={async () => {
                    if (!confirm('Open auction phase? Accepted suppliers will be auto-invited to bid.')) return;
                    try {
                      await api.post(`/rfx-events/${event.id}/auction/open`);
                      window.location.reload();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to open auction');
                    }
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Open Auction
                </button>
              )}

              {event.status === 'AUCTION_OPEN' && (
                <>
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
                    <span className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t('detail.auctionLive', 'AUCTION LIVE')}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(t('detail.confirmCloseAuction', 'Close the auction? No more bids will be accepted.'))) return;
                      try {
                        await api.post(`/rfx-events/${event.id}/auction/close`);
                        window.location.reload();
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Failed to close auction');
                      }
                    }}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Close Auction
                  </button>
                </>
              )}

              {event.auctionStatus === 'CLOSED' && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  <span className="text-xs font-semibold text-amber-700">Auction Completed</span>
                </div>
              )}
            </div>
          )}

          {/* Quick links */}
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{t('related', 'Related')}</h3>
            <div className="space-y-1.5">
              <Link href={`/events/${event.id}/invitations`} className="flex items-center justify-between py-1.5 hover:text-accent transition-colors">
                <span className="text-sm text-text-secondary">{t('supplierInvitations', 'Supplier Invitations')}</span>
                <ChevronRight className="h-3.5 w-3.5 text-text-disabled" />
              </Link>
              <Link href={`/events/${event.id}/bids`} className="flex items-center justify-between py-1.5 hover:text-accent transition-colors">
                <span className="text-sm text-text-secondary">{t('bidSubmissions', 'Bid Submissions')}</span>
                <ChevronRight className="h-3.5 w-3.5 text-text-disabled" />
              </Link>
              {['Evaluations', 'Award'].map((item) => (
                <div key={item} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-text-secondary">{item}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-disabled bg-bg-surface-hover px-1.5 py-0.5 rounded">Sprint 5+</span>
                    <ChevronRight className="h-3.5 w-3.5 text-text-disabled" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
