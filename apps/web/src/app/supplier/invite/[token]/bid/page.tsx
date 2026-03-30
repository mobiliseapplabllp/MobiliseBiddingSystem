'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { api as apiClient } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatCurrency, formatNumber } from '@/lib/format';

interface LineItemRow {
  rfxLineItemId?: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  notes: string;
}

interface LotInfo {
  id: string;
  lotNumber: number;
  title: string;
  lineItems: { id: string; description: string; quantity: number | null; uom: string | null }[];
}

interface InvitationInfo {
  id: string;
  supplierName: string;
  token: string;
  event: {
    id: string;
    refNumber: string;
    title: string;
    currency: string;
    submissionDeadline: string | null;
    lots: LotInfo[];
  };
}

export default function BidSubmissionPage() {
  const t = useTranslations('supplierPortal');
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bidId, setBidId] = useState<string | null>(null);

  // Form state
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { description: '', quantity: '', uom: '', unitPrice: '', notes: '' },
  ]);

  useEffect(() => {
    apiClient.get<InvitationInfo>(`/supplier/invitations/${token}`)
      .then((inv: InvitationInfo) => {
        setInvitation(inv);
        // Pre-populate line items from first lot if lots exist
        if (inv.event.lots?.length > 0) {
          const firstLot = inv.event.lots[0];
          setSelectedLotId(firstLot.id);
          if (firstLot.lineItems.length > 0) {
            setLineItems(firstLot.lineItems.map((li: { id: string; description: string; quantity: number | null; uom: string | null }) => ({
              rfxLineItemId: li.id,
              description: li.description,
              quantity: li.quantity?.toString() ?? '',
              uom: li.uom ?? '',
              unitPrice: '',
              notes: '',
            })));
          }
        }
      })
      .catch(() => router.push(`/supplier/invite/${token}`))
      .finally(() => setLoading(false));
  }, [token, router]);

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', quantity: '', uom: '', unitPrice: '', notes: '' }]);
  }

  function removeLineItem(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: keyof LineItemRow, value: string) {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  }

  function handleLotChange(lotId: string) {
    setSelectedLotId(lotId);
    const lot = invitation?.event.lots.find(l => l.id === lotId);
    if (lot?.lineItems.length) {
      setLineItems(lot.lineItems.map(li => ({
        rfxLineItemId: li.id,
        description: li.description,
        quantity: li.quantity?.toString() ?? '',
        uom: li.uom ?? '',
        unitPrice: '',
        notes: '',
      })));
    } else {
      setLineItems([{ description: '', quantity: '', uom: '', unitPrice: '', notes: '' }]);
    }
  }

  // Auto-compute total from line items
  const computedTotal = lineItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantity) || 0;
    const price = parseFloat(li.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const displayTotal = totalPrice ? parseFloat(totalPrice) : (computedTotal || undefined);

  async function handleSubmit(action: 'draft' | 'submit') {
    if (!invitation) return;
    setSubmitting(true);

    const payload = {
      invitationToken: token,
      lotId: selectedLotId || undefined,
      totalPrice: displayTotal || undefined,
      currency: invitation.event.currency,
      notes: notes || undefined,
      lineItems: lineItems
        .filter(li => li.description.trim())
        .map(li => ({
          rfxLineItemId: li.rfxLineItemId || undefined,
          description: li.description,
          quantity: li.quantity ? parseFloat(li.quantity) : undefined,
          uom: li.uom || undefined,
          unitPrice: li.unitPrice ? parseFloat(li.unitPrice) : undefined,
          notes: li.notes || undefined,
        })),
    };

    try {
      const bid = await apiClient.post<{ id: string }>('/supplier/bids', payload);
      setBidId(bid.id);

      if (action === 'submit') {
        await apiClient.post(`/supplier/bids/${bid.id}/submit?token=${token}`, {});
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save bid.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-muted">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  if (!invitation) return null;

  if (submitted) {
    return (
      <div className="bg-bg-surface rounded-lg border border-border p-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-page-title text-text-primary mb-2">
          {bidId ? t('bidSubmitted') : t('draftSaved')}
        </h2>
        <p className="text-body text-text-muted mb-6">
          {bidId
            ? t('bidSubmittedBodyFull', { ref: invitation.event.refNumber })
            : t('draftSavedBody')}
        </p>
        <button
          onClick={() => router.push(`/supplier/invite/${token}`)}
          className="px-4 py-2 border border-border rounded-md text-text-secondary hover:bg-bg-subtle"
        >
          {t('backToInvitation')}
        </button>
      </div>
    );
  }

  const evt = invitation.event;
  const currency = evt.currency;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/supplier/invite/${token}`)}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('backToInvitation')}
        </button>
        <h1 className="text-page-title text-text-primary">{t('bidsTitle')}</h1>
        <p className="text-body text-text-muted">
          {evt.refNumber} — {evt.title}
        </p>
      </div>

      {/* Lot selector */}
      {evt.lots && evt.lots.length > 0 && (
        <div className="bg-bg-surface rounded-lg border border-border p-5">
          <label className="block text-sm font-medium text-text-primary mb-2">
            {t('biddingFor')}
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { setSelectedLotId(''); setLineItems([{ description: '', quantity: '', uom: '', unitPrice: '', notes: '' }]); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border ${!selectedLotId ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-bg-subtle'}`}
            >
              {t('entireEvent')}
            </button>
            {evt.lots.map(lot => (
              <button
                key={lot.id}
                onClick={() => handleLotChange(lot.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${selectedLotId === lot.id ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-bg-subtle'}`}
              >
                Lot {lot.lotNumber}: {lot.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="bg-bg-surface rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sub-section text-text-primary">{t('lineItems')}</h2>
          <button
            onClick={addLineItem}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="w-4 h-4" />
            {t('addLineItem')}
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((li, idx) => (
            <div key={idx} className="border border-border rounded-md p-4 relative">
              {lineItems.length > 1 && (
                <button
                  onClick={() => removeLineItem(idx)}
                  className="absolute top-3 end-3 text-text-muted hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemDescription')} *</label>
                  <input
                    value={li.description}
                    onChange={e => updateLineItem(idx, 'description', e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={t('lineItemDescriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemQuantity')}</label>
                  <input
                    type="number"
                    value={li.quantity}
                    onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemUom')}</label>
                  <input
                    value={li.uom}
                    onChange={e => updateLineItem(idx, 'uom', e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={t('lineItemUomPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemUnitPrice')} ({currency})</label>
                  <input
                    type="number"
                    value={li.unitPrice}
                    onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemTotal')}</label>
                  <div className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-muted bg-bg-subtle">
                    {li.quantity && li.unitPrice
                      ? formatCurrency(parseFloat(li.quantity) * parseFloat(li.unitPrice), currency)
                      : '—'}
                  </div>
                </div>
              </div>
              {/* Notes for line item */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-text-muted mb-1">{t('lineItemNotes')}</label>
                <input
                  value={li.notes}
                  onChange={e => updateLineItem(idx, 'notes', e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-1.5 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={t('lineItemNotesPlaceholder')}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary & notes */}
      <div className="bg-bg-surface rounded-lg border border-border p-5">
        <h2 className="text-sub-section text-text-primary mb-4">{t('bidSummary')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('totalBidPrice')} ({currency})
            </label>
            <div className="relative">
              <input
                type="number"
                value={totalPrice}
                onChange={e => setTotalPrice(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={computedTotal > 0 ? formatNumber(computedTotal) : '0.00'}
                min="0"
                step="0.01"
              />
              {computedTotal > 0 && !totalPrice && (
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">{t('auto')}</span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {computedTotal > 0 && !totalPrice
                ? t('autoCalculated', { currency, amount: formatNumber(computedTotal) })
                : t('leaveBlankAuto')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">{t('notes')}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-sm text-text-primary bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder={t('bidNotesPlaceholder', 'Add any notes, terms, or conditions for your bid...')}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between bg-bg-surface rounded-lg border border-border p-4">
        <div className="text-sm text-text-muted">
          {t('biddingAs')} <strong className="text-text-primary">{invitation.supplierName}</strong>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="px-4 py-2 border border-border text-text-secondary rounded-md font-medium hover:bg-bg-subtle disabled:opacity-50"
          >
            {t('saveDraft')}
          </button>
          <button
            onClick={() => handleSubmit('submit')}
            disabled={submitting || !lineItems.some(li => li.description.trim())}
            className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('submitting') : t('submitBid')}
          </button>
        </div>
      </div>
    </div>
  );
}
