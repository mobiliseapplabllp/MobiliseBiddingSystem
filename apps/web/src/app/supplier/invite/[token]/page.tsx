'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Calendar, FileText, Package } from 'lucide-react';
import { api as apiClient } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDate, formatTime, formatNumber } from '@/lib/format';

interface LineItem {
  id: string;
  description: string;
  quantity: number | null;
  uom: string | null;
  targetPrice: number | null;
}

interface Lot {
  id: string;
  lotNumber: number;
  title: string;
  description: string | null;
  lineItems: LineItem[];
}

interface Event {
  id: string;
  refNumber: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  currency: string;
  submissionDeadline: string | null;
  lots: Lot[];
}

interface Invitation {
  id: string;
  supplierName: string;
  supplierEmail: string;
  status: string;
  message: string | null;
  token: string;
  event: Event;
}

export default function SupplierInvitePage() {
  const t = useTranslations('supplierPortal');
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    apiClient.get<Invitation>(`/supplier/invitations/${token}`)
      .then(setInvitation)
      .catch(() => setError('Invitation not found or no longer valid.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function respond(response: 'ACCEPTED' | 'DECLINED') {
    setResponding(true);
    try {
      await apiClient.post(`/supplier/invitations/${token}/respond`, { response });
      setResponded(true);
      if (response === 'ACCEPTED') {
        router.push(`/supplier/invite/${token}/bid`);
      } else {
        setInvitation(prev => prev ? { ...prev, status: 'DECLINED' } : prev);
      }
    } catch {
      setError('Failed to respond to invitation. Please try again.');
    } finally {
      setResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-text-muted">{t('loadingInvitation')}</div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="bg-bg-surface rounded-lg border border-border p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-sub-section text-text-primary mb-2">{t('invitationNotFound')}</h2>
        <p className="text-body text-text-muted">{error}</p>
      </div>
    );
  }

  const evt = invitation.event;
  const isPending = invitation.status === 'PENDING';
  const isAccepted = invitation.status === 'ACCEPTED';
  const isDeclined = invitation.status === 'DECLINED';
  const isRevoked = invitation.status === 'REVOKED';
  const eventOpen = evt.status === 'PUBLISHED';
  const deadline = evt.submissionDeadline ? new Date(evt.submissionDeadline) : null;
  const pastDeadline = deadline ? new Date() > deadline : false;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-bg-surface rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption text-text-muted font-mono">{evt.refNumber}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{evt.type}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                evt.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>{evt.status}</span>
            </div>
            <h1 className="text-page-title text-text-primary">{evt.title}</h1>
            {evt.description && (
              <p className="text-body text-text-muted mt-2 max-w-2xl">{evt.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <FileText className="w-4 h-4" />
            <span>{t('currency')}: <strong className="text-text-primary">{evt.currency}</strong></span>
          </div>
          {deadline && (
            <div className={`flex items-center gap-2 text-sm ${pastDeadline ? 'text-red-600' : 'text-text-muted'}`}>
              <Calendar className="w-4 h-4" />
              <span>{t('submissionDeadline')}: <strong>{formatDate(deadline.toISOString())} {formatTime(deadline.toISOString(), { hour: '2-digit', minute: '2-digit' })}</strong></span>
              {pastDeadline && <span className="text-xs font-semibold text-red-600">({t('expired')})</span>}
            </div>
          )}
        </div>
      </div>

      {/* Invitation status */}
      {invitation.message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-1">{t('messagefromBuyer')}</p>
          <p className="text-sm text-blue-700">{invitation.message}</p>
        </div>
      )}

      {/* Response section */}
      {isPending && !responded && (
        <div className="bg-bg-surface rounded-lg border border-border p-6">
          <h2 className="text-sub-section text-text-primary mb-1">{t('respondTitle')}</h2>
          <p className="text-body text-text-muted mb-4">
            {t('respondBody')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => respond('ACCEPTED')}
              disabled={responding || !eventOpen || pastDeadline}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('acceptAndBid')}
            </button>
            <button
              onClick={() => respond('DECLINED')}
              disabled={responding}
              className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-md font-medium hover:bg-bg-subtle"
            >
              <XCircle className="w-4 h-4" />
              {t('decline')}
            </button>
          </div>
          {(!eventOpen || pastDeadline) && (
            <p className="text-sm text-red-600 mt-3">
              {pastDeadline ? t('deadlinePassed') : t('eventNotOpen')}
            </p>
          )}
        </div>
      )}

      {isAccepted && !pastDeadline && eventOpen && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{t('accepted')}</p>
              <p className="text-sm text-green-700">{t('acceptedBody')}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/supplier/invite/${token}/bid`)}
            className="px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90"
          >
            {t('submitBid')}
          </button>
        </div>
      )}

      {isDeclined && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-slate-500" />
          <div>
            <p className="font-medium text-slate-700">{t('declined')}</p>
            <p className="text-sm text-slate-500">{t('declinedBody')}</p>
          </div>
        </div>
      )}

      {isRevoked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="font-medium text-red-700">{t('revoked')}</p>
            <p className="text-sm text-red-500">{t('revokedBody')}</p>
          </div>
        </div>
      )}

      {/* Lots & Line Items */}
      {evt.lots && evt.lots.length > 0 && (
        <div className="bg-bg-surface rounded-lg border border-border p-6">
          <h2 className="text-sub-section text-text-primary mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-text-muted" />
            {t('lotsAndRequirements')}
          </h2>
          <div className="space-y-4">
            {evt.lots.map(lot => (
              <div key={lot.id} className="border border-border rounded-md p-4">
                <h3 className="font-semibold text-text-primary mb-1">
                  Lot {lot.lotNumber}: {lot.title}
                </h3>
                {lot.description && (
                  <p className="text-sm text-text-muted mb-3">{lot.description}</p>
                )}
                {lot.lineItems.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted border-b border-border">
                        <th className="text-start pb-2 font-medium">{t('description')}</th>
                        <th className="text-end pb-2 font-medium w-16">{t('qty')}</th>
                        <th className="text-end pb-2 font-medium w-16">{t('uom')}</th>
                        <th className="text-end pb-2 font-medium w-28">{t('targetPrice')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot.lineItems.map(li => (
                        <tr key={li.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 text-text-primary">{li.description}</td>
                          <td className="py-2 text-end text-text-secondary">{li.quantity ?? '—'}</td>
                          <td className="py-2 text-end text-text-secondary">{li.uom ?? '—'}</td>
                          <td className="py-2 text-end text-text-secondary">
                            {li.targetPrice ? `${evt.currency} ${formatNumber(li.targetPrice)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
