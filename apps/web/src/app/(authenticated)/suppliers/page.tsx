'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import {
  Users, Building2, Globe, Mail, Shield, Download, Upload, Plus,
  Search, Loader2, ExternalLink,
} from 'lucide-react';
import { RoleGate } from '@/components/auth/role-gate';

interface SupplierOrg {
  id: string;
  name: string;
  country: string;
  subdomain: string;
  defaultCurrency: string;
  isActive: boolean;
  supplierType: boolean;
  businessUnits: { id: string; name: string; code: string }[];
}

export default function SuppliersPage() {
  const t = useTranslations('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<SupplierOrg[]>('/orgs')
      .then((orgs) => setSuppliers(orgs.filter((o) => o.supplierType)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter((s) =>
    search === '' ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.country.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = filtered.filter((s) => s.isActive).length;

  return (
    <RoleGate roles={['SUPPLIER_VIEW', 'SUPPLIER_MANAGE', 'PLATFORM_ADMIN']}>
    <div className="max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-rose-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('supplierMaster')}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{t('manageSuppliers')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('export')}</span>
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('import')}</span>
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />
              {t('registerSupplier')}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('kpi.totalSuppliers'), value: suppliers.length, labelColor: 'text-blue-600', valueColor: 'text-gray-900' },
          { label: t('kpi.activeSuppliers'), value: activeCount, labelColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
          { label: t('inactive'), value: suppliers.length - activeCount, labelColor: 'text-red-500', valueColor: 'text-red-500' },
          { label: t('countries'), value: new Set(suppliers.map((s) => s.country)).size, labelColor: 'text-blue-600', valueColor: 'text-blue-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className={`text-[13px] font-medium mb-2 ${kpi.labelColor}`}>{kpi.label}</p>
            <p className={`text-[28px] font-bold ${kpi.valueColor}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2.5 text-[13.5px] bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin me-2" /> {t('loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {search ? t('noMatchingSuppliers') : t('noSuppliersRegistered')}
          </h3>
          <p className="text-sm text-gray-500">
            {search ? t('tryDifferentSearch') : t('registerFirstSupplier')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sup) => (
            <div key={sup.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-gray-900">{sup.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {sup.country}</span>
                      <span>{sup.defaultCurrency}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {sup.subdomain}.esourcing.com</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    sup.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {sup.isActive ? t('statusActive') : t('statusInactive')}
                  </span>
                  <Link href={`/suppliers/${sup.id}`} className="p-2 text-text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
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
