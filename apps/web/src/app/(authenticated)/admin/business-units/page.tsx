'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Building, FolderTree, Pencil, Trash2, Loader2, Download, Upload, Layers } from 'lucide-react';
import { RoleGate } from '@/components/auth/role-gate';
import { ROLES } from '@/lib/auth-context';

interface Organisation { id: string; name: string; }

interface BusinessUnit {
  id: string;
  orgId: string;
  name: string;
  code: string;
  currency: string | null;
  isActive: boolean;
}

interface CurrencyOption { code: string; label: string; }

const BLANK_FORM = { name: '', code: '', currency: '' };

export default function BusinessUnitsPage() {
  const t = useTranslations('admin');
  const [orgs, setOrgs]             = useState<Organisation[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [bus, setBus]               = useState<BusinessUnit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(BLANK_FORM);
  const [creating, setCreating]     = useState(false);

  // Edit
  const [editBu, setEditBu]         = useState<BusinessUnit | null>(null);
  const [editForm, setEditForm]     = useState({ name: '', currency: '' });
  const [saving, setSaving]         = useState(false);

  const loadBus = useCallback(async (orgId: string) => {
    if (!orgId) return;
    try {
      const data = await api.get<BusinessUnit[]>(`/orgs/${orgId}/bus`);
      setBus(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    api.get<Organisation[]>('/orgs')
      .then(data => {
        setOrgs(data);
        if (data.length > 0) setSelectedOrg(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get<CurrencyOption[]>('/master-data?type=CURRENCY').then(setCurrencies).catch(() => {});
  }, []);

  useEffect(() => { loadBus(selectedOrg); }, [selectedOrg, loadBus]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setCreating(true);
    try {
      await api.post(`/orgs/${selectedOrg}/bus`, {
        name: form.name,
        code: form.code,
        currency: form.currency || undefined,
      });
      setShowCreate(false);
      setForm(BLANK_FORM);
      loadBus(selectedOrg);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create BU');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  function openEdit(bu: BusinessUnit) {
    setEditBu(bu);
    setEditForm({ name: bu.name, currency: bu.currency ?? '' });
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBu) return;
    setSaving(true);
    try {
      await api.patch(`/orgs/${selectedOrg}/bus/${editBu.id}`, {
        name: editForm.name,
        currency: editForm.currency || undefined,
      });
      setEditBu(null);
      loadBus(selectedOrg);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update BU');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(bu: BusinessUnit) {
    if (!confirm(`Deactivate "${bu.name}"?`)) return;
    try {
      await api.delete(`/orgs/${selectedOrg}/bus/${bu.id}`);
      loadBus(selectedOrg);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate BU');
    }
  }

  const fieldCls = 'flex h-10 w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <RoleGate roles={[ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN]}>
    <div className="max-w-5xl">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 bg-violet-50">
              <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('businessUnits.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('businessUnits.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!selectedOrg}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Business Units', value: bus.length, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
          { label: 'Active', value: bus.filter(b => b.isActive).length, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
          { label: 'Inactive', value: bus.filter(b => !b.isActive).length, labelColor: 'text-red-500', valueColor: 'text-red-500' },
          { label: 'Organisations', value: orgs.length, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
            <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Org selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1.5">{t('businessUnits.organisationLabel')}</label>
        <select
          value={selectedOrg}
          onChange={e => setSelectedOrg(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        >
          {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </div>

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-lg border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-section-title">{t('businessUnits.createTitle')}</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('businessUnits.nameLabel')}</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={fieldCls} placeholder={t('businessUnits.namePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('businessUnits.codeLabel')}</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required className={`${fieldCls} font-mono`} placeholder={t('businessUnits.codePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('businessUnits.currencyLabel')}</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={fieldCls}>
                  <option value="">— Same as Organisation —</option>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-border rounded-md text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editBu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-lg border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-section-title">Edit Business Unit</h2>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className={fieldCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Currency Override</label>
                <select value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })} className={fieldCls}>
                  <option value="">— Same as Organisation —</option>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditBu(null)} className="flex-1 h-10 border border-border rounded-md text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-bg-surface border border-border rounded-lg p-5">
              <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : bus.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
          <FolderTree className="h-12 w-12 text-text-disabled mx-auto mb-4" />
          <h3 className="text-section-title text-text-primary mb-1">{t('businessUnits.noBusTitle')}</h3>
          <p className="text-text-secondary text-body">{t('businessUnits.noBusBody')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bus.map(bu => (
            <div key={bu.id} className="bg-bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sub-section text-text-primary">{bu.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-caption font-mono text-text-secondary">{bu.code}</span>
                      {bu.currency && <span className="text-caption text-text-secondary">{bu.currency}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(bu)} className="p-2 text-text-secondary hover:text-accent transition-colors" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(bu)} className="p-2 text-text-secondary hover:text-red-600 transition-colors" title="Deactivate">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </RoleGate>
  );
}
