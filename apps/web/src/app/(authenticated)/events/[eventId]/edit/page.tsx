'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, Clock,
  FileText, DollarSign, Gavel, TrendingDown, Layers, Info,
  Plus, Trash2, Package, ClipboardList, Users, ShieldCheck, Briefcase, Sparkles,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MdmOption { code: string; label: string; }

interface LineItemForm {
  id?: string;
  description: string;
  quantity: string;
  uom: string;
  targetPrice: string;
  notes: string;
}

interface LotForm {
  id?: string;
  title: string;
  description: string;
  lineItems: LineItemForm[];
}

type EventType = 'RFI' | 'RFP' | 'RFQ' | 'ITT' | 'REVERSE_AUCTION' | 'DUTCH_AUCTION' | 'JAPANESE_AUCTION';

interface EditForm {
  title: string;
  description: string;
  type: EventType;
  currency: string;
  estimatedValue: string;
  internalRef: string;
  submissionDeadline: string;
  clarificationDeadline: string;
  lots: LotForm[];
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
  createdAt: string;
  lots: Array<{
    id: string;
    lotNumber: number;
    title: string;
    description: string | null;
    lineItems: Array<{
      id: string;
      itemNumber: number;
      description: string;
      quantity: string | null;
      uom: string | null;
      targetPrice: string | null;
      notes: string | null;
    }>;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isAuctionType(type: string): boolean {
  return type === 'REVERSE_AUCTION' || type === 'DUTCH_AUCTION' || type === 'JAPANESE_AUCTION';
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputCls =
  'w-full h-[42px] px-3.5 rounded-lg border border-border bg-bg-subtle/50 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-bg-surface transition-all';
const textareaCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-border bg-bg-subtle/50 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-bg-surface transition-all resize-none';
const labelCls = 'block text-[13px] font-semibold text-text-secondary mb-1.5';

const TYPE_LABELS: Record<string, string> = {
  RFI: 'RFI', RFP: 'RFP', RFQ: 'RFQ', ITT: 'ITT',
  REVERSE_AUCTION: 'Reverse Auction', DUTCH_AUCTION: 'Dutch Auction', JAPANESE_AUCTION: 'Japanese Auction',
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function EditEventPage() {
  const t = useTranslations('events');
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<RfxEvent | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [currencies, setCurrencies] = useState<MdmOption[]>([]);
  const [uoms, setUoms] = useState<MdmOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load event + MDM data
  useEffect(() => {
    Promise.all([
      api.get<RfxEvent>(`/rfx-events/${eventId}`),
      api.get<MdmOption[]>('/master-data?type=CURRENCY'),
      api.get<MdmOption[]>('/master-data?type=UOM'),
    ])
      .then(([evt, cur, uom]) => {
        setEvent(evt);
        setCurrencies(cur);
        setUoms(uom);

        // Populate form from event
        setForm({
          title: evt.title,
          description: evt.description ?? '',
          type: evt.type as EventType,
          currency: evt.currency,
          estimatedValue: evt.estimatedValue ?? '',
          internalRef: evt.internalRef ?? '',
          submissionDeadline: toDatetimeLocal(evt.submissionDeadline),
          clarificationDeadline: toDatetimeLocal(evt.clarificationDeadline),
          lots: evt.lots.map((lot) => ({
            id: lot.id,
            title: lot.title,
            description: lot.description ?? '',
            lineItems: lot.lineItems.map((li) => ({
              id: li.id,
              description: li.description,
              quantity: li.quantity ?? '',
              uom: li.uom ?? '',
              targetPrice: li.targetPrice ?? '',
              notes: li.notes ?? '',
            })),
          })),
        });
      })
      .catch(() => setError('Failed to load event'))
      .finally(() => setLoading(false));
  }, [eventId]);

  const updateForm = useCallback(
    (patch: Partial<EditForm>) => setForm((f) => f ? { ...f, ...patch } : f),
    [],
  );

  // Save handler
  const handleSave = async () => {
    if (!form || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/rfx-events/${eventId}`, {
        title: form.title,
        description: form.description || undefined,
        currency: form.currency,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        internalRef: form.internalRef || undefined,
        submissionDeadline: form.submissionDeadline
          ? new Date(form.submissionDeadline).toISOString()
          : undefined,
        clarificationDeadline: form.clarificationDeadline
          ? new Date(form.clarificationDeadline).toISOString()
          : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading / Error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-bg-subtle rounded" />
        <div className="h-6 w-96 bg-bg-subtle rounded" />
        <div className="h-[400px] bg-bg-subtle rounded-xl" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="max-w-4xl">
        <div className="bg-error/5 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{error}</p>
          <Link href="/events" className="btn-secondary mt-4 inline-flex">{t('backToEvents', 'Back to Events')}</Link>
        </div>
      </div>
    );
  }

  if (!event || !form) return null;

  const isDraft = event.status === 'DRAFT';
  const auction = isAuctionType(form.type);

  if (!isDraft) {
    return (
      <div className="max-w-4xl">
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-warning mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{t('cannotEditPublished')}</p>
          <Link href={`/events/${eventId}`} className="btn-secondary mt-4 inline-flex">
            <ArrowLeft className="h-4 w-4" /> {t('view')}
          </Link>
        </div>
      </div>
    );
  }

  // ─── Lot/Item helpers ─────────────────────────────────────────────────────────

  const addLot = () => {
    updateForm({
      lots: [...form.lots, { title: '', description: '', lineItems: [{ description: '', quantity: '', uom: '', targetPrice: '', notes: '' }] }],
    });
  };

  const removeLot = (idx: number) => {
    updateForm({ lots: form.lots.filter((_, i) => i !== idx) });
  };

  const updateLot = (idx: number, patch: Partial<LotForm>) => {
    const updated = [...form.lots];
    updated[idx] = { ...updated[idx], ...patch };
    updateForm({ lots: updated });
  };

  const addLineItem = (lotIdx: number) => {
    const updated = [...form.lots];
    updated[lotIdx] = {
      ...updated[lotIdx],
      lineItems: [...updated[lotIdx].lineItems, { description: '', quantity: '', uom: '', targetPrice: '', notes: '' }],
    };
    updateForm({ lots: updated });
  };

  const removeLineItem = (lotIdx: number, itemIdx: number) => {
    const updated = [...form.lots];
    updated[lotIdx] = {
      ...updated[lotIdx],
      lineItems: updated[lotIdx].lineItems.filter((_, i) => i !== itemIdx),
    };
    updateForm({ lots: updated });
  };

  const updateLineItem = (lotIdx: number, itemIdx: number, patch: Partial<LineItemForm>) => {
    const updated = [...form.lots];
    const items = [...updated[lotIdx].lineItems];
    items[itemIdx] = { ...items[itemIdx], ...patch };
    updated[lotIdx] = { ...updated[lotIdx], lineItems: items };
    updateForm({ lots: updated });
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {event.refNumber}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-page-title text-text-primary">{t('editEvent')}</h1>
            <p className="text-text-muted text-body mt-1">{t('editEventSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-text-muted bg-bg-subtle px-2.5 py-1 rounded-full uppercase">
              {TYPE_LABELS[event.type] ?? event.type}
            </span>
            <span className="text-[11px] font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full">
              DRAFT
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-error/5 border border-error/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-error shrink-0" />
          <p className="text-[13px] text-error">{error}</p>
        </div>
      )}

      {/* Success banner */}
      {saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-success/5 border border-success/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <p className="text-[13px] text-success font-medium">{t('saveSuccess')}</p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Overview Section */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-text-muted" />
              Overview
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Title */}
            <div>
              <label className={labelCls}>Title <span className="text-error">*</span></label>
              <input
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={4}
                className={textareaCls}
              />
            </div>

            {/* Currency + Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Currency</label>
                <select value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })} className={inputCls}>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Estimated Value</label>
                <input
                  type="number"
                  value={form.estimatedValue}
                  onChange={(e) => updateForm({ estimatedValue: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Internal Ref */}
            <div>
              <label className={labelCls}>Internal Reference</label>
              <input
                value={form.internalRef}
                onChange={(e) => updateForm({ internalRef: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Timing Section */}
        {!auction && (
          <div className="bg-bg-surface border border-border rounded-xl shadow-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                Timing
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Submission Deadline</label>
                <input
                  type="datetime-local"
                  value={form.submissionDeadline}
                  onChange={(e) => updateForm({ submissionDeadline: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Clarification Deadline</label>
                <input
                  type="datetime-local"
                  value={form.clarificationDeadline}
                  onChange={(e) => updateForm({ clarificationDeadline: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lots & Items Section */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <Package className="h-4 w-4 text-text-muted" />
              Lots & Line Items
            </h2>
            <button type="button" onClick={addLot} className="btn-secondary text-[12px] flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Lot
            </button>
          </div>

          <div className="p-5 space-y-6">
            {form.lots.map((lot, lotIdx) => (
              <div key={lotIdx} className="border border-border rounded-xl overflow-hidden">
                {/* Lot Header */}
                <div className="bg-bg-subtle/50 px-5 py-3 flex items-center justify-between border-b border-border">
                  <span className="text-sm font-bold text-text-primary">Lot {lotIdx + 1}</span>
                  <button type="button" onClick={() => removeLot(lotIdx)} className="text-text-muted hover:text-error transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Lot Title <span className="text-error">*</span></label>
                      <input
                        value={lot.title}
                        onChange={(e) => updateLot(lotIdx, { title: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Lot Description</label>
                      <input
                        value={lot.description}
                        onChange={(e) => updateLot(lotIdx, { description: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-bg-subtle/30">
                          <th className="text-start px-3 py-2 text-[11px] font-semibold text-text-muted uppercase">Description</th>
                          <th className="text-start px-3 py-2 text-[11px] font-semibold text-text-muted uppercase w-20">Qty</th>
                          <th className="text-start px-3 py-2 text-[11px] font-semibold text-text-muted uppercase w-24">UOM</th>
                          <th className="text-start px-3 py-2 text-[11px] font-semibold text-text-muted uppercase w-28">Target Price</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lot.lineItems.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td className="px-3 py-2">
                              <input
                                value={item.description}
                                onChange={(e) => updateLineItem(lotIdx, itemIdx, { description: e.target.value })}
                                placeholder="Item description"
                                className="w-full px-2 py-1.5 text-[13px] border border-border rounded bg-bg-surface focus:ring-1 focus:ring-accent/20 focus:border-accent outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(lotIdx, itemIdx, { quantity: e.target.value })}
                                className="w-full px-2 py-1.5 text-[13px] border border-border rounded bg-bg-surface focus:ring-1 focus:ring-accent/20 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.uom}
                                onChange={(e) => updateLineItem(lotIdx, itemIdx, { uom: e.target.value })}
                                className="w-full px-2 py-1.5 text-[13px] border border-border rounded bg-bg-surface focus:ring-1 focus:ring-accent/20 outline-none"
                              >
                                <option value="">—</option>
                                {uoms.map((u) => (
                                  <option key={u.code} value={u.code}>{u.code}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.targetPrice}
                                onChange={(e) => updateLineItem(lotIdx, itemIdx, { targetPrice: e.target.value })}
                                className="w-full px-2 py-1.5 text-[13px] border border-border rounded bg-bg-surface focus:ring-1 focus:ring-accent/20 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeLineItem(lotIdx, itemIdx)} className="text-text-muted hover:text-error transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() => addLineItem(lotIdx)}
                    className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Line Item
                  </button>
                </div>
              </div>
            ))}

            {form.lots.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-[13px]">No lots yet. Click "Add Lot" to start.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-4">
          <Link
            href={`/events/${eventId}`}
            className="btn-secondary flex items-center gap-2 text-[13px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
