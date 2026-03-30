'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime, formatCurrency, formatDate } from '@/lib/format';
import {
  ArrowLeft, FileSignature, AlertCircle, Calendar, DollarSign,
  Building2, Clock, FileText,
} from 'lucide-react';

interface Amendment {
  id: string;
  title: string;
  description: string | null;
  effectiveDate: string | null;
  createdAt: string;
}

interface ContractDetail {
  id: string;
  title: string;
  description: string | null;
  refNumber: string;
  status: string;
  contractType: string | null;
  currency: string;
  totalValue: string | null;
  startDate: string | null;
  endDate: string | null;
  signedAt: string | null;
  supplierId: string | null;
  rfxEventId: string | null;
  awardId: string | null;
  paymentTerms: string | null;
  createdAt: string;
  amendments: Amendment[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-warning/10 text-warning',
  ACTIVE: 'bg-success/10 text-success',
  EXPIRED: 'bg-error/10 text-error',
  TERMINATED: 'bg-error/10 text-error',
  RENEWED: 'bg-accent/10 text-accent',
};

export default function ContractDetailPage() {
  const t = useTranslations('contracts');
  const params = useParams();
  const contractId = params.contractId as string;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ContractDetail>(`/contracts/${contractId}`)
      .then(setContract)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [contractId]);

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-bg-subtle rounded" />
        <div className="h-[300px] bg-bg-subtle rounded-xl" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-4xl">
        <div className="bg-error/5 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{error || 'Contract not found'}</p>
          <Link href="/contracts" className="btn-secondary mt-4 inline-flex">{t('title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/contracts" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('title')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono text-accent">{contract.refNumber}</span>
              {contract.contractType && (
                <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded">{contract.contractType}</span>
              )}
            </div>
            <h1 className="text-page-title text-text-primary">{contract.title}</h1>
            {contract.description && <p className="text-text-muted text-body mt-1">{contract.description}</p>}
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[contract.status] ?? 'bg-bg-subtle text-text-muted'}`}>
            {contract.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Total Value</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">
            {contract.totalValue ? formatCurrency(Number(contract.totalValue), contract.currency) : '—'}
          </p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Start Date</p>
          <p className="text-[13px] font-medium text-text-primary mt-1">{contract.startDate ? formatDate(contract.startDate) : '—'}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">End Date</p>
          <p className="text-[13px] font-medium text-text-primary mt-1">{contract.endDate ? formatDate(contract.endDate) : '—'}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Amendments</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{contract.amendments.length}</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-text-muted" /> Contract Details
          </h2>
        </div>
        <div className="divide-y divide-border">
          {contract.paymentTerms && (
            <div className="px-5 py-3 flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-text-muted shrink-0" />
              <div><p className="text-[11px] text-text-muted uppercase">Payment Terms</p><p className="text-[13px] text-text-primary">{contract.paymentTerms}</p></div>
            </div>
          )}
          {contract.signedAt && (
            <div className="px-5 py-3 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-muted shrink-0" />
              <div><p className="text-[11px] text-text-muted uppercase">Signed</p><p className="text-[13px] text-text-primary">{formatDateTime(contract.signedAt)}</p></div>
            </div>
          )}
          <div className="px-5 py-3 flex items-center gap-3">
            <Clock className="h-4 w-4 text-text-muted shrink-0" />
            <div><p className="text-[11px] text-text-muted uppercase">Created</p><p className="text-[13px] text-text-primary">{formatDateTime(contract.createdAt)}</p></div>
          </div>
        </div>
      </div>

      {/* Amendments */}
      {contract.amendments.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" /> Amendments
            </h2>
          </div>
          <div className="divide-y divide-border">
            {contract.amendments.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <p className="text-[13px] font-medium text-text-primary">{a.title}</p>
                {a.description && <p className="text-[12px] text-text-muted mt-0.5">{a.description}</p>}
                <p className="text-[11px] text-text-muted mt-1">
                  {a.effectiveDate ? `Effective: ${formatDate(a.effectiveDate)}` : formatDateTime(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
