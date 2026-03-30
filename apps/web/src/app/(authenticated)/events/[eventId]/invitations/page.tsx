'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Trash2, CheckCircle2, XCircle, Clock, Ban,
  Mail, User, Plus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTranslations } from '@/hooks/useTranslations';
import { formatDateTime } from '@/lib/format';

interface Invitation {
  id: string;
  supplierEmail: string;
  supplierName: string;
  status: string;
  sentAt: string | null;
  respondedAt: string | null;
  token: string;
}

interface EventInfo {
  id: string;
  refNumber: string;
  title: string;
  status: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:  <Clock className="w-4 h-4 text-amber-500" />,
  ACCEPTED: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  DECLINED: <XCircle className="w-4 h-4 text-red-500" />,
  REVOKED:  <Ban className="w-4 h-4 text-slate-400" />,
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  DECLINED: 'bg-red-50 text-red-600',
  REVOKED:  'bg-slate-100 text-slate-500',
};

function fmt(d: string | null) {
  if (!d) return '—';
  return formatDateTime(d);
}

export default function InvitationsPage() {
  const t = useTranslations('events');
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [showForm, setShowForm] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<EventInfo>(`/rfx-events/${eventId}`),
      api.get<Invitation[]>(`/rfx-events/${eventId}/invitations`),
    ])
      .then(([evt, invs]) => {
        setEvent(evt);
        setInvitations(invs);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  async function sendInvitation() {
    if (!supplierEmail || !supplierName) {
      setFormError('Email and name are required.');
      return;
    }
    setSending(true);
    setFormError('');
    try {
      const inv = await api.post<Invitation>(`/rfx-events/${eventId}/invitations`, {
        supplierEmail,
        supplierName,
        message: message || undefined,
      });
      setInvitations(prev => [inv, ...prev]);
      setShowForm(false);
      setSupplierEmail('');
      setSupplierName('');
      setMessage('');
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to send invitation.');
    } finally {
      setSending(false);
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!window.confirm('Revoke this invitation? The supplier will no longer be able to submit a bid.')) return;
    try {
      await api.delete(`/rfx-events/${eventId}/invitations/${invitationId}`);
      setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status: 'REVOKED' } : i));
    } catch {
      alert('Failed to revoke invitation.');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-text-secondary text-sm">{t('loading', 'Loading...')}</div>;
  }

  const canInvite = event && ['DRAFT', 'PUBLISHED'].includes(event.status);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToEvent', 'Back to Event')}
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-caption text-text-muted font-mono mb-0.5">{event?.refNumber}</p>
            <h1 className="text-page-title text-text-primary">{t('supplierInvitations', 'Supplier Invitations')}</h1>
            <p className="text-body text-text-muted">{event?.title}</p>
          </div>
          {canInvite && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('inviteSupplier', 'Invite Supplier')}
            </button>
          )}
        </div>
      </div>

      {/* Invite form */}
      {showForm && (
        <div className="bg-bg-surface rounded-lg border border-border p-5 mb-6">
          <h2 className="text-sub-section text-text-primary mb-4 flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('newInvitation', 'New Invitation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('supplierEmail', 'Supplier Email')} *
              </label>
              <input
                type="email"
                value={supplierEmail}
                onChange={e => setSupplierEmail(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="supplier@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {t('supplierCompanyName', 'Supplier / Company Name')} *
              </label>
              <input
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Acme Supplies Ltd"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('messageToSupplier', 'Message to Supplier (optional)')}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg-base focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Add a personal message or instructions for the supplier..."
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 mb-3">{formError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={sendInvitation}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" />
              {sending ? t('sending', 'Sending...') : t('sendInvitation', 'Send Invitation')}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-4 py-2 border border-border text-text-secondary rounded-md font-medium hover:bg-bg-subtle text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invitations list */}
      <div className="bg-bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sub-section text-text-primary">
            Invitations ({invitations.length})
          </h2>
        </div>

        {invitations.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-sub-section text-text-primary mb-1">{t('noInvitationsYet', 'No invitations yet')}</p>
            <p className="text-body text-text-muted">
              {canInvite ? 'Send your first invitation to suppliers to get responses.' : 'No suppliers were invited to this event.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invitations.map(inv => (
              <div key={inv.id} className="px-5 py-4 flex items-center gap-4 hover:bg-bg-subtle transition-colors">
                <div className="flex-shrink-0">
                  {STATUS_ICON[inv.status] ?? <Clock className="w-4 h-4 text-text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-text-primary text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      {inv.supplierName}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[inv.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {inv.supplierEmail}
                    </span>
                    <span>Sent: {fmt(inv.sentAt)}</span>
                    {inv.respondedAt && <span>Responded: {fmt(inv.respondedAt)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Copy portal link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/supplier/invite/${inv.token}`);
                    }}
                    title="Copy portal link"
                    className="text-xs text-text-muted hover:text-primary px-2 py-1 border border-border rounded hover:border-primary transition-colors"
                  >
                    {t('copyLink', 'Copy Link')}
                  </button>
                  {/* Revoke */}
                  {['PENDING', 'ACCEPTED'].includes(inv.status) && canInvite && (
                    <button
                      onClick={() => revokeInvitation(inv.id)}
                      title="Revoke invitation"
                      className="p-1.5 text-text-muted hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
