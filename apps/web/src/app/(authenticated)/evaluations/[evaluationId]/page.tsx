'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime } from '@/lib/format';
import {
  ArrowLeft, ClipboardCheck, Users, BarChart3, AlertCircle,
  CheckCircle2, Clock, Loader2, FileText,
} from 'lucide-react';

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  envelope: string;
  weight: number;
  maxScore: number;
  sortOrder: number;
}

interface Assignment {
  id: string;
  evaluatorId: string;
  envelope: string;
  status: string;
  assignedAt: string;
}

interface Score {
  id: string;
  criterionId: string;
  evaluatorId: string;
  supplierId: string;
  score: number;
  comments: string | null;
  createdAt: string;
}

interface Evaluation {
  id: string;
  title: string;
  description: string | null;
  rfxEventId: string;
  envelopeType: string;
  status: string;
  technicalWeight: string | null;
  commercialWeight: string | null;
  createdAt: string;
  criteria: Criterion[];
  assignments: Assignment[];
  scores: Score[];
  _count: { criteria: number; assignments: number; scores: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-warning/10 text-warning',
  IN_PROGRESS: 'bg-accent/10 text-accent',
  COMPLETED: 'bg-success/10 text-success',
  CANCELLED: 'bg-error/10 text-error',
};

export default function EvaluationDetailPage() {
  const t = useTranslations('evaluations');
  const params = useParams();
  const evaluationId = params.evaluationId as string;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Evaluation>(`/evaluations/${evaluationId}`)
      .then(setEvaluation)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [evaluationId]);

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-48 bg-bg-subtle rounded" />
        <div className="h-[300px] bg-bg-subtle rounded-xl" />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="max-w-4xl">
        <div className="bg-error/5 border border-error/20 rounded-xl p-8 text-center">
          <AlertCircle className="h-10 w-10 text-error mx-auto mb-3" />
          <p className="text-text-primary font-semibold">{error || 'Evaluation not found'}</p>
          <Link href="/evaluations" className="btn-secondary mt-4 inline-flex">{t('title')}</Link>
        </div>
      </div>
    );
  }

  const envelopeLabel =
    evaluation.envelopeType === 'DOUBLE' ? t('envelopeDouble') :
    evaluation.envelopeType === 'THREE_ENVELOPE' ? t('envelopeThree') :
    t('envelopeSingle');

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/evaluations" className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-accent transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> {t('title')}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-page-title text-text-primary">{evaluation.title}</h1>
            {evaluation.description && (
              <p className="text-text-muted text-body mt-1">{evaluation.description}</p>
            )}
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[evaluation.status] ?? 'bg-bg-subtle text-text-muted'}`}>
            {evaluation.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">{t('envelopeType')}</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{envelopeLabel}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">{t('criteria')}</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{evaluation._count.criteria}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">{t('col.evaluators')}</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{evaluation._count.assignments}</p>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-muted font-medium uppercase">{t('score')}</p>
          <p className="text-[16px] font-bold text-text-primary mt-1">{evaluation._count.scores}</p>
        </div>
      </div>

      {/* Weights */}
      {(evaluation.technicalWeight || evaluation.commercialWeight) && (
        <div className="bg-bg-surface border border-border rounded-lg p-5 mb-6">
          <h3 className="text-[13px] font-semibold text-text-secondary mb-3">{t('weight')}</h3>
          <div className="flex items-center gap-6">
            {evaluation.technicalWeight && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <span className="text-[13px] text-text-primary">{t('technicalScore')}: <strong>{evaluation.technicalWeight}%</strong></span>
              </div>
            )}
            {evaluation.commercialWeight && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-[13px] text-text-primary">{t('commercialScore')}: <strong>{evaluation.commercialWeight}%</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Criteria Table */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-text-muted" /> {t('criteriaSection', 'Evaluation Criteria')}
          </h2>
        </div>
        {evaluation.criteria.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-[13px]">No criteria defined</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-subtle/50 border-b border-border">
                  <th className="text-start px-5 py-2.5 text-[11px] font-semibold text-text-muted uppercase">#</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">{t('criterionName')}</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">{t('criterionEnvelope')}</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">{t('criterionWeight')}</th>
                  <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase">{t('criterionMaxScore')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {evaluation.criteria.map((c, i) => (
                  <tr key={c.id} className="hover:bg-bg-subtle/30 transition-colors">
                    <td className="px-5 py-3 text-text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{c.name}</p>
                      {c.description && <p className="text-[12px] text-text-muted mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold text-text-secondary bg-bg-subtle px-2 py-0.5 rounded">{c.envelope}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.weight}%</td>
                    <td className="px-4 py-3 font-mono">{c.maxScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluator Assignments */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" /> {t('assignEvaluators')}
          </h2>
        </div>
        {evaluation.assignments.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-[13px]">No evaluators assigned yet</div>
        ) : (
          <div className="divide-y divide-border">
            {evaluation.assignments.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">{a.evaluatorId.substring(0, 8)}...</p>
                    <p className="text-[11px] text-text-muted">{a.envelope} envelope</p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  a.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                  a.status === 'IN_PROGRESS' ? 'bg-accent/10 text-accent' :
                  'bg-warning/10 text-warning'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
