'use client';

import Link from 'next/link';
import { Bell, CheckCheck, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { useNotificationList, markAllNotificationsRead } from '@/hooks/useNotifications';
import { NotificationItem } from './notification-item';
import { markNotificationRead } from '@/hooks/useNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange?: () => void;
}

export function NotificationDropdown({ open, onClose, onCountChange }: Props) {
  const t = useTranslations('notifications');
  const { data, loading, refetch } = useNotificationList({ pageSize: 5 });

  if (!open) return null;

  const hasUnread = data.some((n) => !n.isRead);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    refetch();
    onCountChange?.();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    refetch();
    onCountChange?.();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown card */}
      <div className="absolute end-0 top-full mt-1.5 w-80 sm:w-96 bg-bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-text-primary">{t('title')}</h3>
          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="text-[12px] text-accent hover:text-accent-dark font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </button>
          )}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-bg-subtle shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-bg-subtle rounded" />
                    <div className="h-2.5 w-1/2 bg-bg-subtle rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-[13px] text-text-muted">{t('noNotifications')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {data.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkRead={handleMarkRead}
                compact
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border">
          <Link
            href="/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-[12px] text-accent hover:text-accent-dark font-medium transition-colors"
          >
            {t('viewAll')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
