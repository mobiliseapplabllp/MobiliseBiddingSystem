'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  ArrowLeft, ClipboardCheck, Plus, Trash2, Save, Loader2,
  AlertCircle, CheckCircle2, Sparkles,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface RfxEventOption {
  id: string;
  refNumber: string;
  title: string;
  type: string;
  status: string;
}

type EnvelopeType = 'SINGLE' | 'DOUBLE' | 'THREE_ENVELOPE';
type CriterionEnvelope = 'TECHNICAL' | 'COMMERCIAL' | 'GENERAL';

interface CriterionForm {
  name: string;
  description: string;
  envelope: CriterionEnvelope;
  weight: string;
  maxScore: string;
}

interface EvalForm {
  rfxEventId: string;
  title: string;
  description: string;
  envelopeType: EnvelopeType;
  technicalWeight: string;
  commercialWeight: string;
  criteria: CriterionForm[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const INITIAL_CRITERION: CriterionForm = {
  name: '',
  description: '',
  envelope: 'TECHNICAL',
  weight: '25',
  maxScore: '10',
};

const INITIAL_FORM: EvalForm = {
  rfxEventId: '',
  title: '',
  description: '',
  envelopeType: 'SINGLE',
  technicalWeight: '70',
  commercialWeight: '30',
  criteria: [{ ...INITIAL_CRITERION }],
};

const inputCls =
  'w-full h-[42px] px-3.5 rounded-lg border border-border bg-bg-subtle/50 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-bg-surface transition-all';
const textareaCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-border bg-bg-subtle/50 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-bg-surface transition-all resize-none';
const labelCls = 'block text-[13px] font-semibold text-text-secondary mb-1.5';

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function CreateEvaluationPage() {
  const t = useTranslations('evaluations');
  const router = useRouter();

  const [form, setForm] = useState<EvalForm>(INITIAL_FORM);
  const [events, setEvents] = useState<RfxEventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load closed/evaluable events
  useEffect(() => {
    api
      .get<{ data: RfxEventOption[] }>('/rfx-events?status=CLOSED&pageSize=100')
      .then((res) => {
        const evts = res.data ?? (Array.isArray(res) ? res : []);
        setEvents(evts);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<EvalForm>) => setForm((f) => ({ ...f, ...patch }));

  // Criteria helpers
  const addCriterion = () => {
    update({ criteria: [...form.criteria, { ...INITIAL_CRITERION, weight: '0' }] });
  };

  const removeCriterion = (idx: number) => {
    update({ criteria: form.criteria.filter((_, i) => i !== idx) });
  };

  const updateCriterion = (idx: number, patch: Partial<CriterionForm>) => {
    const updated = [...form.criteria];
    updated[idx] = { ...updated[idx], ...patch };
    update({ criteria: updated });
  };

  // AI suggest criteria
  const [aiLoading, setAiLoading] = useState(false);
  const handleAISuggest = async () => {
    const selectedEvent = events.find((e) => e.id === form.rfxEventId);
    if (!selectedEvent || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.post<{ criteria?: Array<{ name: string; description?: string; weight: number; maxScore?: number; envelope?: string }> }>('/ai/rfx/suggest-criteria', {
        eventType: selectedEvent.type,
        description: form.title || selectedEvent.title,
      });
      if (res.criteria && res.criteria.length > 0) {
        const newCriteria: CriterionForm[] = res.criteria.map((c) => ({
          name: c.name,
          description: c.description ?? '',
          envelope: (c.envelope as CriterionEnvelope) ?? 'TECHNICAL',
          weight: String(c.weight ?? 25),
          maxScore: String(c.maxScore ?? 10),
        }));
        update({ criteria: newCriteria });
      }
    } catch {
      // Silently fail
    } finally {
      setAiLoading(false);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        rfxEventId: form.rfxEventId,
        title: form.title,
        description: form.description || undefined,
        envelopeType: form.envelopeType,
        technicalWeight: Number(form.technicalWeight),
        commercialWeight: Number(form.commercialWeight),
        criteria: form.criteria.map((c, i) => ({
          name: c.name,
          description: c.description || undefined,
          envelope: c.envelope,
          weight: Number(c.weight),
          maxScore: Number(c.maxScore) || 10,
          sortOrder: i,
        })),
      };
      const result = await api.post<{ id: string }>('/evaluations', payload);
      router.push('/evaluations');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = form.rfxEventId && form.title.trim() && form.criteria.length > 0 && form.criteria.every((c) => c.name.trim());

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/evaluations"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('title')}
        </Link>
        <h1 className="text-page-title text-text-primary">{t('createEvaluation')}</h1>
        <p className="text-text-muted text-body mt-1">{t('createEvaluationSubtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-error/5 border border-error/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-error shrink-0" />
          <p className="text-[13px] text-error">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Event Selection + Title */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-text-muted" />
              {t('createEvaluation')}
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Select Event */}
            <div>
              <label className={labelCls}>{t('selectEvent')} <span className="text-error">*</span></label>
              {loading ? (
                <div className="h-[42px] bg-bg-subtle rounded-lg animate-pulse" />
              ) : events.length === 0 ? (
                <p className="text-[13px] text-text-muted italic">{t('noClosedEvents')}</p>
              ) : (
                <select
                  value={form.rfxEventId}
                  onChange={(e) => {
                    const evt = events.find((ev) => ev.id === e.target.value);
                    update({
                      rfxEventId: e.target.value,
                      title: evt ? `Evaluation — ${evt.title}` : form.title,
                    });
                  }}
                  className={inputCls}
                >
                  <option value="">{t('selectEventPlaceholder')}</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.refNumber} — {evt.title} ({evt.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Title */}
            <div>
              <label className={labelCls}>{t('evaluationTitle')} <span className="text-error">*</span></label>
              <input
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={t('evaluationTitlePlaceholder')}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>{t('description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
                className={textareaCls}
              />
            </div>

            {/* Envelope Type + Weights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{t('envelopeType')}</label>
                <select
                  value={form.envelopeType}
                  onChange={(e) => update({ envelopeType: e.target.value as EnvelopeType })}
                  className={inputCls}
                >
                  <option value="SINGLE">{t('envelopeSingle')}</option>
                  <option value="DOUBLE">{t('envelopeDouble')}</option>
                  <option value="THREE_ENVELOPE">{t('envelopeThree')}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('technicalWeight')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.technicalWeight}
                  onChange={(e) => update({ technicalWeight: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('commercialWeight')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.commercialWeight}
                  onChange={(e) => update({ commercialWeight: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Criteria Section */}
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-text-primary">{t('criteriaSection')}</h2>
              <p className="text-[12px] text-text-muted mt-0.5">{t('criteriaDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              {form.rfxEventId && (
                <button
                  type="button"
                  onClick={handleAISuggest}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-accent bg-accent/5 hover:bg-accent/10 rounded-lg border border-accent/20 transition-all disabled:opacity-40"
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {aiLoading ? t('loading') : 'AI Suggest'}
                </button>
              )}
              <button type="button" onClick={addCriterion} className="btn-secondary text-[12px] flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                {t('addCriterion')}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {form.criteria.map((criterion, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-text-muted uppercase">
                    {t('criteria')} {idx + 1}
                  </span>
                  {form.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(idx)}
                      className="text-[11px] text-text-muted hover:text-error flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('removeCriterion')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t('criterionName')} <span className="text-error">*</span></label>
                    <input
                      value={criterion.name}
                      onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                      placeholder="e.g. Technical Compliance"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('criterionDescription')}</label>
                    <input
                      value={criterion.description}
                      onChange={(e) => updateCriterion(idx, { description: e.target.value })}
                      placeholder="Brief description..."
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>{t('criterionEnvelope')}</label>
                    <select
                      value={criterion.envelope}
                      onChange={(e) => updateCriterion(idx, { envelope: e.target.value as CriterionEnvelope })}
                      className={inputCls}
                    >
                      <option value="TECHNICAL">Technical</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('criterionWeight')}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterion.weight}
                      onChange={(e) => updateCriterion(idx, { weight: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('criterionMaxScore')}</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={criterion.maxScore}
                      onChange={(e) => updateCriterion(idx, { maxScore: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}

            {form.criteria.length === 0 && (
              <div className="text-center py-8">
                <ClipboardCheck className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-[13px] text-text-muted">{t('criteriaDescription')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between py-4">
          <Link href="/evaluations" className="btn-secondary flex items-center gap-2 text-[13px]">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="btn-primary flex items-center gap-2 text-[13px] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? t('creating') : t('createEvaluation')}
          </button>
        </div>
      </div>
    </div>
  );
}
