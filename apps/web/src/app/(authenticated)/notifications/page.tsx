'use client';

import { useState, useCallback } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import {
  useNotificationList,
  useUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationType,
} from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/notification-item';

const NOTIFICATION_TYPES: NotificationType[] = [
  'EVENT_PUBLISHED', 'BID_RECEIVED',
  'AUCTION_STARTED', 'AUCTION_CLOSED', 'AUCTION_BID_PLACED',
  'EVALUATION_ASSIGNED', 'EVALUATION_COMPLETED',
  'AWARD_APPROVED', 'AWARD_REJECTED',
  'CONTRACT_CREATED', 'CONTRACT_EXPIRING', 'CONTRACT_ACTIVATED',
  'SUPPLIER_REGISTERED', 'SUPPLIER_APPROVED',
  'REMINDER', 'SYSTEM',
];

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const ts = useTranslations('settings');

  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filter = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(unreadOnly ? { isRead: false } : {}),
    page,
    pageSize,
  };

  const { data, meta, loading, refetch } = useNotificationList(filter);
  const { count: unreadCount, refetch: refetchUnread } = useUnreadCount();

  const handleMarkRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    refetch();
    refetchUnread();
  }, [refetch, refetchUnread]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    refetch();
    refetchUnread();
  }, [refetch, refetchUnread]);

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, meta.total);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-page-title text-text-primary">{t('title')}</h1>
          <p className="text-text-muted text-body mt-1">{t('subtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary flex items-center gap-2 text-[13px]"
          >
            <CheckCheck className="h-4 w-4" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as NotificationType | ''); setPage(1); }}
            className="ps-8 pe-4 py-2 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none cursor-pointer"
          >
            <option value="">{t('allTypes')}</option>
            {NOTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ts(`notifications.${type}`, type)}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <span className="text-[13px] text-text-secondary">{t('unreadOnly')}</span>
        </label>

        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-error text-white text-[10px] font-bold">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Notification list */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-bg-subtle mt-2.5" />
                <div className="h-8 w-8 rounded-lg bg-bg-subtle shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 bg-bg-subtle rounded" />
                  <div className="h-3 w-1/2 bg-bg-subtle rounded" />
                  <div className="h-2.5 w-1/4 bg-bg-subtle rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Bell className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-30" />
            <p className="text-[15px] font-semibold text-text-primary mb-1">{t('noNotifications')}</p>
            <p className="text-[13px] text-text-muted">{t('noNotificationsDescription')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-[12px] text-text-muted">
              {t('showing', { from: String(from), to: String(to), total: String(meta.total) })}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t('previous')}
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('next')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
