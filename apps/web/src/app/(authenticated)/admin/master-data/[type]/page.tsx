'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  Plus,
  Check,
  X,
  Pencil,
  Loader2,
  ArrowLeft,
  ChevronRight,
  DollarSign,
  Globe,
  Clock,
  Languages,
  Scale,
  CreditCard,
  Ship,
  Tag,
  FileText,
  FileCheck,
  Trophy,
  XCircle,
  ClipboardList,
  Download,
  Upload,
  Search,
  ChevronDown,
  Trash2,
} from 'lucide-react';

// ─── Metadata ──────────────────────────────────────────────────────────────────

const MDM_META: Record<string, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  CURRENCY:            { label: 'Currency',            description: 'ISO 4217 currency codes used in pricing and financial fields across all events.',     icon: DollarSign,    color: '#2563EB', bg: '#EFF6FF' },
  COUNTRY:             { label: 'Country',             description: 'ISO 3166-1 country codes for supplier addresses, locations, and compliance.',          icon: Globe,         color: '#059669', bg: '#ECFDF5' },
  TIMEZONE:            { label: 'Timezone',            description: 'IANA timezone identifiers for event scheduling and deadline management.',              icon: Clock,         color: '#7C3AED', bg: '#F5F3FF' },
  LANGUAGE:            { label: 'Language',            description: 'ISO 639-1 language codes for localisation and supplier communication.',                icon: Languages,     color: '#EA580C', bg: '#FFF7ED' },
  UOM:                 { label: 'Unit of Measure',     description: 'Standard and custom units used in line items, quantities, and bid pricing.',           icon: Scale,         color: '#0891B2', bg: '#ECFEFF' },
  PAYMENT_TERM:        { label: 'Payment Terms',       description: 'Standard payment terms such as Net 30, Net 60, and advance payment conditions.',       icon: CreditCard,    color: '#DB2777', bg: '#FDF2F8' },
  INCOTERM:            { label: 'Incoterms',           description: 'International trade terms defining delivery, risk, and cost allocation rules.',        icon: Ship,          color: '#4338CA', bg: '#EEF2FF' },
  SPEND_CATEGORY:      { label: 'Spend Category',      description: 'Procurement spend categories for spend analytics and category management.',            icon: Tag,           color: '#D97706', bg: '#FFFBEB' },
  DOCUMENT_TYPE:       { label: 'Document Type',       description: 'Types of documents attached to events, bids, contracts, and compliance.',              icon: FileText,      color: '#DC2626', bg: '#FEF2F2' },
  CONTRACT_TYPE:       { label: 'Contract Type',       description: 'Contract structures such as fixed-price, time-and-materials, and framework.',          icon: FileCheck,     color: '#0E7490', bg: '#ECFEFF' },
  AWARD_CRITERIA:      { label: 'Award Criteria',      description: 'Scoring dimensions used in multi-criteria evaluation and award decisions.',            icon: Trophy,        color: '#65A30D', bg: '#F7FEE7' },
  REJECTION_REASON:    { label: 'Rejection Reason',    description: 'Standardised reasons for rejecting bids, submissions, or award nominations.',          icon: XCircle,       color: '#E11D48', bg: '#FFF1F2' },
  EVALUATION_CRITERIA: { label: 'Evaluation Criteria', description: 'Technical and commercial evaluation dimensions with weightings for RFx scoring.',      icon: ClipboardList, color: '#6D28D9', bg: '#F5F3FF' },
};

function slugToType(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_');
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReferenceDataItem {
  id: string;
  type: string;
  code: string;
  label: string;
  orgId: string | null;
  metadata: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
}

// ─── Add Entry Form ────────────────────────────────────────────────────────────

function AddEntryModal({
  type,
  onSaved,
  onCancel,
}: {
  type: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !label.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/master-data', { type, code: code.trim().toUpperCase(), label: label.trim(), sortOrder });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">{t('addNewEntry', 'Add New Entry')}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('code', 'Code')} <span className="text-red-500">*</span></label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. USD"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Will be stored in uppercase</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('nameLabel', 'Name / Label')} <span className="text-red-500">*</span></label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Display name"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('sortOrder', 'Sort Order')}</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? t('saving', 'Saving...') : t('saveEntry', 'Save Entry')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inline Edit Row ───────────────────────────────────────────────────────────

function EditableRow({ item, onSaved, onCancel }: { item: ReferenceDataItem; onSaved: () => void; onCancel: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [sortOrder, setSortOrder] = useState(item.sortOrder);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/master-data/${item.id}`, { label, sortOrder });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="bg-amber-50/60 border-b border-amber-100">
      <td className="px-5 py-4 text-sm text-gray-400">&nbsp;</td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 font-mono text-[12px] text-gray-600">
          {item.code}
        </span>
      </td>
      <td className="px-5 py-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[13.5px] border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </td>
      <td className="px-5 py-4 text-sm text-gray-400">—</td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center text-[12px] font-semibold px-2.5 py-1 rounded-full ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={handleSave} disabled={saving} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
            {saving ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Check className="h-[18px] w-[18px]" />}
          </button>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MasterDataTypePage() {
  const t = useTranslations('masterData');
  const params = useParams();
  const slug = Array.isArray(params.type) ? params.type[0] : (params.type ?? '');
  const mdmType = slugToType(slug);
  const meta = MDM_META[mdmType];

  const [items, setItems] = useState<ReferenceDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ReferenceDataItem[]>(`/master-data?type=${mdmType}`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [mdmType]);

  useEffect(() => { load(); }, [load]);

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this entry? It will no longer appear in dropdowns.')) return;
    await api.delete(`/master-data/${id}`);
    await load();
  }

  if (!meta) {
    return (
      <div className="max-w-4xl">
        <p className="text-red-600 text-sm">Unknown data type: {slug}</p>
        <Link href="/admin/master-data" className="text-blue-600 text-sm hover:underline mt-2 inline-block">← Back to Master Data</Link>
      </div>
    );
  }

  const IconComponent = meta.icon;

  // Derived counts
  const totalItems = items.length;
  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.filter((i) => !i.isActive).length;
  const recentCount = items.filter((i) => {
    if (!i.createdAt) return false;
    return Date.now() - new Date(i.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Filtered display
  const filtered = items.filter((item) => {
    const matchSearch =
      search === '' ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.isActive) ||
      (statusFilter === 'inactive' && !item.isActive);
    return matchSearch && matchStatus;
  });

  const filterLabel = statusFilter === 'all' ? 'All Items' : statusFilter === 'active' ? 'Active' : 'Inactive';

  return (
    <div className="max-w-5xl">
      {/* Add Entry Modal */}
      {showAdd && (
        <AddEntryModal
          type={mdmType}
          onSaved={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link href="/admin/master-data" className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('backToMasterData', 'Back to Master Data')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-gray-900 font-medium">{meta.label}</span>
        </div>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: meta.bg }}
            >
              <IconComponent className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: meta.color }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{meta.label}</h1>
              <p className="text-sm text-gray-500 mt-0.5 max-w-lg">{meta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('export', 'Export')}</span>
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('import', 'Import')}</span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('addNew', 'Add New')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('totalItems', 'Total Items'),    value: totalItems,    labelColor: 'text-blue-600',    valueColor: 'text-gray-900' },
          { label: t('active', 'Active'),         value: activeCount,   labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
          { label: t('inactive', 'Inactive'),       value: inactiveCount, labelColor: 'text-red-500',     valueColor: 'text-red-500' },
          { label: t('recentlyAdded', 'Recently Added'), value: recentCount,   labelColor: 'text-blue-600',    valueColor: 'text-blue-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
            <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${meta.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-10 pe-4 py-2.5 text-[13.5px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors min-w-[130px] justify-between"
          >
            {filterLabel}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute end-0 top-full mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                {(['all', 'active', 'inactive'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                    className={`w-full text-start px-4 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      statusFilter === opt ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt === 'all' ? 'All Items' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin me-2" />
            Loading entries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
              <IconComponent className="h-6 w-6" style={{ color: meta.color }} />
            </div>
            <p className="font-semibold text-gray-700">
              {search || statusFilter !== 'all' ? 'No matching entries' : 'No entries yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Add the first entry using the button above.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500 w-12">#</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500 w-40">{t('code', 'Code')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('nameValue', 'Name/Value')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500">{t('description', 'Description')}</th>
                <th className="px-5 py-3.5 text-start text-[12px] font-semibold text-gray-500 w-24">{t('status', 'Status')}</th>
                <th className="px-5 py-3.5 w-24 text-center text-[12px] font-semibold text-gray-500">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item, idx) =>
                editingId === item.id ? (
                  <EditableRow
                    key={item.id}
                    item={item}
                    onSaved={() => { setEditingId(null); load(); }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-gray-400 text-[13px]">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 font-mono text-[12px] font-medium text-gray-600">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-[13.5px] text-gray-900">{item.label}</td>
                    <td className="px-5 py-4 text-[13.5px] text-gray-400">
                      {item.metadata && Object.keys(item.metadata).length > 0
                        ? String(Object.values(item.metadata)[0])
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-[18px] w-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {totalItems} {totalItems === 1 ? 'entry' : 'entries'}
            </p>
            <p className="text-xs text-gray-400">
              {activeCount} active · {inactiveCount} inactive
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
