'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { RoleGate } from '@/components/auth/role-gate';
import { ROLES } from '@/lib/auth-context';
import { useTranslations } from '@/hooks/useTranslations';
import {
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
  ArrowRight,
  Search,
  Layers,
} from 'lucide-react';

interface TypeCount {
  type: string;
  count: number;
}

const MDM_CONFIG = [
  {
    type: 'CURRENCY',
    slug: 'currency',
    label: 'Currency',
    description: 'ISO 4217 currency codes used in pricing and financial fields across all events.',
    icon: DollarSign,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    type: 'COUNTRY',
    slug: 'country',
    label: 'Country',
    description: 'ISO 3166-1 country codes for supplier addresses, locations, and compliance.',
    icon: Globe,
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    type: 'TIMEZONE',
    slug: 'timezone',
    label: 'Timezone',
    description: 'IANA timezone identifiers for event scheduling and deadline management.',
    icon: Clock,
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    type: 'LANGUAGE',
    slug: 'language',
    label: 'Language',
    description: 'ISO 639-1 language codes for localisation and supplier communication.',
    icon: Languages,
    color: '#EA580C',
    bg: '#FFF7ED',
  },
  {
    type: 'UOM',
    slug: 'uom',
    label: 'Unit of Measure',
    description: 'Standard and custom units used in line items, quantities, and bid pricing.',
    icon: Scale,
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    type: 'PAYMENT_TERM',
    slug: 'payment-term',
    label: 'Payment Terms',
    description: 'Standard payment terms such as Net 30, Net 60, and advance payment conditions.',
    icon: CreditCard,
    color: '#DB2777',
    bg: '#FDF2F8',
  },
  {
    type: 'INCOTERM',
    slug: 'incoterm',
    label: 'Incoterms',
    description: 'International trade terms defining delivery, risk, and cost allocation rules.',
    icon: Ship,
    color: '#4338CA',
    bg: '#EEF2FF',
  },
  {
    type: 'SPEND_CATEGORY',
    slug: 'spend-category',
    label: 'Spend Category',
    description: 'Procurement spend categories for spend analytics and category management.',
    icon: Tag,
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    type: 'DOCUMENT_TYPE',
    slug: 'document-type',
    label: 'Document Type',
    description: 'Types of documents attached to events, bids, contracts, and compliance.',
    icon: FileText,
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    type: 'CONTRACT_TYPE',
    slug: 'contract-type',
    label: 'Contract Type',
    description: 'Contract structures such as fixed-price, time-and-materials, and framework.',
    icon: FileCheck,
    color: '#0E7490',
    bg: '#ECFEFF',
  },
  {
    type: 'AWARD_CRITERIA',
    slug: 'award-criteria',
    label: 'Award Criteria',
    description: 'Scoring dimensions used in multi-criteria evaluation and award decisions.',
    icon: Trophy,
    color: '#65A30D',
    bg: '#F7FEE7',
  },
  {
    type: 'REJECTION_REASON',
    slug: 'rejection-reason',
    label: 'Rejection Reason',
    description: 'Standardised reasons for rejecting bids, submissions, or award nominations.',
    icon: XCircle,
    color: '#E11D48',
    bg: '#FFF1F2',
  },
  {
    type: 'EVALUATION_CRITERIA',
    slug: 'evaluation-criteria',
    label: 'Evaluation Criteria',
    description: 'Technical and commercial evaluation dimensions with weightings for RFx scoring.',
    icon: ClipboardList,
    color: '#6D28D9',
    bg: '#F5F3FF',
  },
] as const;

export default function MasterDataPage() {
  const t = useTranslations('masterData');
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<TypeCount[]>('/master-data/types').then(setTypeCounts).catch(() => {});
  }, []);

  function getCount(type: string) {
    return typeCounts.find((tc) => tc.type === type)?.count ?? 0;
  }

  const totalItems = typeCounts.reduce((sum, tc) => sum + tc.count, 0);
  const configuredTypes = typeCounts.filter((tc) => tc.count > 0).length;

  const filtered = MDM_CONFIG.filter(
    (cfg) =>
      search === '' ||
      cfg.label.toLowerCase().includes(search.toLowerCase()) ||
      cfg.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <RoleGate roles={[ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN]}>
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title', 'Master Data Management')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('subtitle', 'Configure reference data used across all modules — currencies, countries, categories, and more.')}
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('totalTypes', 'Total Types'), value: MDM_CONFIG.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('totalItems', 'Total Items'), value: totalItems, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('configuredTypes', 'Configured Types'), value: configuredTypes, icon: FileCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: t('platformDefaults', 'Platform Defaults'), value: totalItems, icon: Globe, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{kpi.label}</p>
              <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 font-mono">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t('searchDataTypes', 'Search data types...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full ps-9 pe-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((cfg) => {
          const count = getCount(cfg.type);
          return (
            <Link
              key={cfg.type}
              href={`/admin/master-data/${cfg.slug}`}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Colored top strip */}
              <div className="h-1" style={{ backgroundColor: cfg.color }} />

              <div className="p-5">
                {/* Icon + title */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <cfg.icon className="h-5 w-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[14.5px] text-gray-900 group-hover:text-blue-600 transition-colors">
                      {cfg.label}
                    </h3>
                    <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {cfg.description}
                    </p>
                  </div>
                </div>

                {/* Footer: count + manage */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-800">{count}</span> items
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-blue-600 group-hover:gap-2 transition-all">
                    {t('manage', 'Manage')} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
    </RoleGate>
  );
}
