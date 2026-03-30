'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Trash2, ArrowRight, BookTemplate } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDate } from '@/lib/format';

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: string;
  currency: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  RFI: 'bg-blue-50 text-blue-700',
  RFP: 'bg-violet-50 text-violet-700',
  RFQ: 'bg-emerald-50 text-emerald-700',
  ITT: 'bg-amber-50 text-amber-700',
};

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'RFI' | 'RFP' | 'RFQ' | 'ITT'>('RFQ');
  const [formDesc, setFormDesc] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Use from template
  const [useTemplate, setUseTemplate] = useState<Template | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<Template[]>('/rfx-templates')
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  async function saveTemplate() {
    if (!formName.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const created = await api.post<Template>('/rfx-templates', {
        name: formName, type: formType, description: formDesc || undefined, currency: formCurrency,
      });
      setTemplates(prev => [created, ...prev]);
      setShowForm(false);
      setFormName(''); setFormDesc(''); setFormCurrency('USD');
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/rfx-templates/${id}`);
    setTemplates(prev => prev.filter(item => item.id !== id));
  }

  async function createFromTemplate() {
    if (!useTemplate || !newTitle.trim()) return;
    setCreating(true);
    try {
      const event = await api.post<{ id: string }>('/rfx-templates/from-template', {
        templateId: useTemplate.id, title: newTitle,
      });
      router.push(`/events/${event.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create event.');
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-text-secondary text-sm">{t('loadingTemplates', 'Loading templates...')}</div>;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-page-title text-text-primary">{t('rfxTemplates', 'RFx Templates')}</h1>
          <p className="text-body text-text-muted mt-0.5">{t('templatesSubtitle', 'Save reusable event structures to speed up event creation')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('newTemplate', 'New Template')}
        </button>
      </div>

      {/* Create template form */}
      {showForm && (
        <div className="bg-bg-surface rounded-lg border border-border p-5 mb-6">
          <h2 className="text-sub-section text-text-primary mb-4">{t('createTemplate', 'Create Template')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">{t('templateName', 'Template Name')} *</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Standard IT Procurement Template"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">{t('eventType', 'Event Type')}</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as 'RFI' | 'RFP' | 'RFQ' | 'ITT')}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="RFI">RFI — Request for Information</option>
                <option value="RFP">RFP — Request for Proposal</option>
                <option value="RFQ">RFQ — Request for Quotation</option>
                <option value="ITT">ITT — Invitation to Tender</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">{t('defaultCurrency', 'Default Currency')}</label>
              <input
                value={formCurrency}
                onChange={e => setFormCurrency(e.target.value.toUpperCase())}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="USD"
                maxLength={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">{t('description', 'Description')}</label>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                rows={2}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Describe when to use this template..."
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <div className="flex gap-3">
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? t('saving', 'Saving...') : t('saveTemplate', 'Save Template')}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-4 py-2 border border-border text-text-secondary rounded-md font-medium text-sm hover:bg-bg-subtle"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Use-template modal */}
      {useTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-lg border border-border p-6 w-full max-w-md shadow-lg">
            <h2 className="text-sub-section text-text-primary mb-1">{t('createEventFromTemplate', 'Create Event from Template')}</h2>
            <p className="text-sm text-text-muted mb-4">
              Using: <strong>{useTemplate.name}</strong> ({useTemplate.type})
            </p>
            <label className="block text-sm font-medium text-text-primary mb-1">{t('eventTitle', 'Event Title')} *</label>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary mb-4"
              placeholder="e.g. Supply of IT Equipment — Q3 2026"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={createFromTemplate}
                disabled={creating || !newTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? t('creating', 'Creating...') : t('createEvent', 'Create Event')}
                {!creating && <ArrowRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setUseTemplate(null); setNewTitle(''); }}
                className="px-4 py-2 border border-border text-text-secondary rounded-md font-medium text-sm hover:bg-bg-subtle"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="bg-bg-surface rounded-lg border border-border py-16 text-center">
          <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-sub-section text-text-primary mb-1">{t('noTemplatesYet', 'No templates yet')}</p>
          <p className="text-body text-text-muted mb-4">
            {t('noTemplatesDescription', 'Create a template to reuse event structures and speed up procurement.')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 mx-auto"
          >
            <Plus className="w-4 h-4" />
            {t('createFirstTemplate', 'Create First Template')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-bg-surface rounded-lg border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookTemplate className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[tpl.type] ?? 'bg-slate-100 text-slate-600'}`}>
                    {tpl.type}
                  </span>
                </div>
                <button
                  onClick={() => deleteTemplate(tpl.id)}
                  className="p-1 text-text-muted hover:text-red-500 rounded"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-text-primary text-sm mb-1">{tpl.name}</h3>
              {tpl.description && (
                <p className="text-xs text-text-muted mb-3 line-clamp-2">{tpl.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-text-muted">{tpl.currency} · {formatDate(tpl.createdAt)}</span>
                <button
                  onClick={() => { setUseTemplate(tpl); setNewTitle(''); }}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {t('useTemplate', 'Use Template')} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
