'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime, formatCurrency } from '@/lib/format';
import {
  ArrowLeft, Award, AlertCircle, CheckCircle2, Clock, DollarSign,
  Users, FileText, ThumbsUp, ThumbsDown,
} from 'lucide-react';

interface AwardItem {
  id: string;
  supplierId: string;
  lotId: string | null;
  awardedValue: string | null;
  justification: string | null;
  status: string;
}

interface ApprovalStep {
  id: string;
  approverId: string;
  level: number;
  status: string;
  comments: string | null;
  decidedAt: string | null;
}

interface AwardDetail {
  id: string;
  title: string;
  description: string | null;
  rfxEventId: string;
  evaluationId: string | null;
  status: string;
  totalValue: string | null;
  currency: string;
  createdAt: string;
  items: AwardItem[];
  approvalSteps: ApprovalStep[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-warning/10 text-warning',
  PENDING_APPROVAL: 'bg-accent/10 text-accent',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
  CANCELLED: 'bg-bg-subtle text-text-muted',
};

export default function AwardDetailPage() {
  const t = useTranslations('awards');
  const params = useParams();
  const awardId = params.awardId as string;
  const [award, setAward] = useState<AwardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AwardDetail>(`/awards/${awardId}`)
      .then(setAward)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [awardId]);

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-bg-subtle rounded" />
        <div className="h-[300px] bg-bg-subtle rounded-xl" />
      </div>
    );
  }

  if (error || !award) {
    return (
      <div className="max-w-4xl">
        <div className="bg-error/5 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{error || 'Award not found'}</p>
          <Link href="/awards" className="btn-secondary mt-4 inline-flex">{t('title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/awards" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('title')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-page-title text-text-primary">{award.title}</h1>
            {award.description && <p className="text-text-muted text-body mt-1">{award.description}</p>}
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[award.status] ?? 'bg-bg-subtle text-text-muted'}`}>
            {award.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Total Value</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">
            {award.totalValue ? formatCurrency(Number(award.totalValue), award.currency) : '—'}
          </p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Award Items</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{award.items.length}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">Created</p>
          <p className="text-[13px] font-medium text-text-primary mt-1">{formatDateTime(award.createdAt)}</p>
        </div>
      </div>

      {/* Award Items */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
            <Award className="h-4 w-4 text-text-muted" /> Award Items
          </h2>
        </div>
        {award.items.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-[13px]">No award items</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-subtle/50 border-b border-border">
                  <th className="text-start px-5 py-2.5 text-[11px] font-semibold text-text-muted uppercase">Supplier</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">Value</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">Status</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {award.items.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-[12px] text-text-secondary">{item.supplierId.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono">{item.awardedValue ? formatCurrency(Number(item.awardedValue), award.currency) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status] ?? 'bg-bg-subtle text-text-muted'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary max-w-[200px] truncate">{item.justification ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval Steps */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-text-muted" /> Approval Workflow
          </h2>
        </div>
        {award.approvalSteps.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-[13px]">No approval steps</div>
        ) : (
          <div className="divide-y divide-border">
            {award.approvalSteps.map((step) => (
              <div key={step.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    step.status === 'APPROVED' ? 'bg-success/10' : step.status === 'REJECTED' ? 'bg-error/10' : 'bg-warning/10'
                  }`}>
                    {step.status === 'APPROVED' ? <ThumbsUp className="h-4 w-4 text-success" /> :
                     step.status === 'REJECTED' ? <ThumbsDown className="h-4 w-4 text-error" /> :
                     <Clock className="h-4 w-4 text-warning" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">Level {step.level} Approver</p>
                    {step.comments && <p className="text-[11px] text-text-muted">{step.comments}</p>}
                  </div>
                </div>
                <div className="text-end">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[step.status] ?? 'bg-warning/10 text-warning'}`}>
                    {step.status}
                  </span>
                  {step.decidedAt && <p className="text-[10px] text-text-muted mt-0.5">{formatDateTime(step.decidedAt)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
