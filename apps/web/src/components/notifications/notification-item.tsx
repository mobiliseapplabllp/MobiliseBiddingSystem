'use client';

import Link from 'next/link';
import {
  FileText, FileCheck, Gavel, ClipboardCheck, Award, FileSignature,
  UserPlus, Clock, Info, Bell, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/hooks/useNotifications';

// ---------------------------------------------------------------------------
// Icon & colour mapping per notification type
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<NotificationType, { icon: typeof FileText; color: string; bg: string }> = {
  EVENT_PUBLISHED:     { icon: FileText,       color: 'text-accent',  bg: 'bg-accent/10' },
  BID_RECEIVED:        { icon: FileCheck,      color: 'text-success', bg: 'bg-success/10' },
  AUCTION_STARTED:     { icon: Gavel,          color: 'text-error',   bg: 'bg-error/10' },
  AUCTION_CLOSED:      { icon: Gavel,          color: 'text-text-muted', bg: 'bg-bg-subtle' },
  AUCTION_BID_PLACED:  { icon: Gavel,          color: 'text-warning', bg: 'bg-warning/10' },
  EVALUATION_ASSIGNED: { icon: ClipboardCheck, color: 'text-accent',  bg: 'bg-accent/10' },
  EVALUATION_COMPLETED:{ icon: ShieldCheck,    color: 'text-success', bg: 'bg-success/10' },
  AWARD_APPROVED:      { icon: Award,          color: 'text-success', bg: 'bg-success/10' },
  AWARD_REJECTED:      { icon: AlertTriangle,  color: 'text-error',   bg: 'bg-error/10' },
  CONTRACT_CREATED:    { icon: FileSignature,  color: 'text-accent',  bg: 'bg-accent/10' },
  CONTRACT_EXPIRING:   { icon: Clock,          color: 'text-warning', bg: 'bg-warning/10' },
  CONTRACT_ACTIVATED:  { icon: FileSignature,  color: 'text-success', bg: 'bg-success/10' },
  SUPPLIER_REGISTERED: { icon: UserPlus,       color: 'text-accent',  bg: 'bg-accent/10' },
  SUPPLIER_APPROVED:   { icon: UserPlus,       color: 'text-success', bg: 'bg-success/10' },
  REMINDER:            { icon: Clock,          color: 'text-warning', bg: 'bg-warning/10' },
  SYSTEM:              { icon: Info,           color: 'text-text-muted', bg: 'bg-bg-subtle' },
};

// ---------------------------------------------------------------------------
// Entity link mapping
// ---------------------------------------------------------------------------

function entityLink(entityType: string | null, entityId: string | null): string {
  if (!entityType) return '/notifications';
  switch (entityType) {
    case 'RFX_EVENT':
      return entityId ? `/events/${entityId}` : '/events';
    case 'AUCTION':
      return entityId ? `/events/${entityId}` : '/events';
    case 'EVALUATION':
      return '/evaluations';
    case 'AWARD':
      return entityId ? `/awards/${entityId}` : '/awards';
    case 'CONTRACT':
      return entityId ? `/contracts/${entityId}` : '/contracts';
    case 'SUPPLIER_PROFILE':
      return '/suppliers';
    default:
      return '/notifications';
  }
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({ notification, onMarkRead, compact = false }: Props) {
  const config = TYPE_CONFIG[notification.type] ?? { icon: Bell, color: 'text-text-muted', bg: 'bg-bg-subtle' };
  const Icon = config.icon;
  const href = entityLink(notification.entityType, notification.entityId);

  const handleClick = () => {
    if (!notification.isRead && onMarkRead) {
      onMarkRead(notification.id);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle/60 ${
        !notification.isRead ? 'bg-accent/[0.03]' : ''
      }`}
    >
      {/* Unread dot */}
      <div className="flex items-center pt-1 shrink-0">
        <div
          className={`h-2 w-2 rounded-full ${
            notification.isRead ? 'bg-transparent' : 'bg-accent'
          }`}
        />
      </div>

      {/* Icon */}
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] text-text-primary truncate ${!notification.isRead ? 'font-semibold' : ''}`}>
          {notification.title}
        </p>
        {!compact && notification.body && (
          <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[11px] text-text-muted mt-0.5">{relativeTime(notification.createdAt)}</p>
      </div>
    </Link>
  );
}
