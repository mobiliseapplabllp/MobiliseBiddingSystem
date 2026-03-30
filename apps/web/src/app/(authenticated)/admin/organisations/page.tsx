'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { RoleGate } from '@/components/auth/role-gate';
import { ROLES } from '@/lib/auth-context';
import { Plus, Building2, Globe, Pencil, Trash2, Loader2, Download, Upload } from 'lucide-react';

interface Organisation {
  id: string;
  name: string;
  country: string;
  subdomain: string;
  defaultCurrency: string;
  defaultLocale: string;
  buIsolation: boolean;
  isActive: boolean;
  businessUnits: { id: string; name: string; code: string }[];
}

interface CurrencyOption { code: string; label: string; }
interface CountryOption  { code: string; label: string; }

const BLANK_FORM = { name: '', country: '', subdomain: '', defaultCurrency: 'USD' };

export default function OrganisationsPage() {
  const t = useTranslations('admin');
  const [orgs, setOrgs]           = useState<Organisation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [countries, setCountries]   = useState<CountryOption[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(BLANK_FORM);
  const [creating, setCreating]     = useState(false);

  // Edit modal
  const [editOrg, setEditOrg]     = useState<Organisation | null>(null);
  const [editForm, setEditForm]   = useState({ name: '', country: '', defaultCurrency: '' });
  const [saving, setSaving]       = useState(false);

  const fetchOrgs = useCallback(async () => {
    try {
      const data = await api.get<Organisation[]>('/orgs');
      setOrgs(data);
    } catch { /* API may not be running */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
    api.get<CurrencyOption[]>('/master-data?type=CURRENCY').then(setCurrencies).catch(() => {});
    api.get<CountryOption[]>('/master-data?type=COUNTRY').then(setCountries).catch(() => {});
  }, [fetchOrgs]);

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/orgs', form);
      setShowCreate(false);
      setForm(BLANK_FORM);
      fetchOrgs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create organisation');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  function openEdit(org: Organisation) {
    setEditOrg(org);
    setEditForm({ name: org.name, country: org.country, defaultCurrency: org.defaultCurrency });
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrg) return;
    setSaving(true);
    try {
      await api.patch(`/orgs/${editOrg.id}`, editForm);
      setEditOrg(null);
      fetchOrgs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(org: Organisation) {
    if (!confirm(`Deactivate "${org.name}"? This will hide it from the platform.`)) return;
    try {
      await api.delete(`/orgs/${org.id}`);
      fetchOrgs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate organisation');
    }
  }

  // ── Shared select classes ───────────────────────────────────────────────────
  const fieldCls = 'flex h-10 w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <RoleGate roles={[ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN]}>
    <div className="max-w-5xl">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('organisations.title')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('organisations.subtitle')}</p>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
          { label: 'Total Organisations', value: orgs.length, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
          { label: 'Active', value: orgs.filter(o => o.isActive).length, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
          { label: 'Inactive', value: orgs.filter(o => !o.isActive).length, labelColor: 'text-red-500', valueColor: 'text-red-500' },
          { label: 'Total Business Units', value: orgs.reduce((sum, o) => sum + o.businessUnits.length, 0), labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
            <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-lg border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-section-title">{t('organisations.createTitle')}</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('organisations.nameLabel')}</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required className={fieldCls} placeholder={t('organisations.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('organisations.countryLabel')}</label>
                <select
                  value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value })}
                  required className={fieldCls}
                >
                  <option value="">Select country...</option>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('organisations.subdomainLabel')}</label>
                <input
                  value={form.subdomain}
                  onChange={e => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required className={`${fieldCls} font-mono`} placeholder={t('organisations.subdomainPlaceholder')}
                />
                <p className="text-caption text-text-secondary mt-1">{form.subdomain || 'acme'}.esourcing.com</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('organisations.currencyLabel')}</label>
                <select
                  value={form.defaultCurrency}
                  onChange={e => setForm({ ...form, defaultCurrency: e.target.value })}
                  className={fieldCls}
                >
                  {currencies.length === 0
                    ? <option value="USD">USD</option>
                    : currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)
                  }
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-10 border border-border rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editOrg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface rounded-lg border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-section-title">Edit Organisation</h2>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required className={fieldCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Country</label>
                <select
                  value={editForm.country}
                  onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                  className={fieldCls}
                >
                  {countries.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Default Currency</label>
                <select
                  value={editForm.defaultCurrency}
                  onChange={e => setEditForm({ ...editForm, defaultCurrency: e.target.value })}
                  className={fieldCls}
                >
                  {currencies.length === 0
                    ? <option value="USD">USD</option>
                    : currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)
                  }
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOrg(null)} className="flex-1 h-10 border border-border rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
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
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg-surface border border-border rounded-lg p-5 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded-lg p-12 text-center">
          <Building2 className="h-12 w-12 text-text-disabled mx-auto mb-4" />
          <h3 className="text-section-title text-text-primary mb-1">{t('organisations.noOrgsTitle')}</h3>
          <p className="text-text-secondary text-body">{t('organisations.noOrgsBody')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => (
            <div key={org.id} className="bg-bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sub-section text-text-primary">{org.name}</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-body-small text-text-secondary flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {org.subdomain}.esourcing.com
                    </span>
                    <span className="text-body-small text-text-secondary">{org.country}</span>
                    <span className="text-body-small text-text-secondary">{org.defaultCurrency}</span>
                    <span className="text-caption px-2 py-0.5 rounded-full bg-success/10 text-success">
                      {org.businessUnits.length} BU{org.businessUnits.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${org.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {org.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => openEdit(org)}
                    className="p-2 text-text-secondary hover:text-accent transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(org)}
                    className="p-2 text-text-secondary hover:text-red-600 transition-colors"
                    title="Deactivate"
                  >
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
