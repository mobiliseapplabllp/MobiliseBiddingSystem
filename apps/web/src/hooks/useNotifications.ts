'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'EVENT_PUBLISHED' | 'BID_RECEIVED'
  | 'AUCTION_STARTED' | 'AUCTION_CLOSED' | 'AUCTION_BID_PLACED'
  | 'EVALUATION_ASSIGNED' | 'EVALUATION_COMPLETED'
  | 'AWARD_APPROVED' | 'AWARD_REJECTED'
  | 'CONTRACT_CREATED' | 'CONTRACT_EXPIRING' | 'CONTRACT_ACTIVATED'
  | 'SUPPLIER_REGISTERED' | 'SUPPLIER_APPROVED'
  | 'REMINDER' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  channel: string;
  createdAt: string;
}

export interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  inApp: boolean;
}

interface PaginatedNotifications {
  data: Notification[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface NotificationFilter {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// useUnreadCount — polls every 30s
// ---------------------------------------------------------------------------

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      if (mountedRef.current) setCount(res.count);
    } catch {
      // Silently fail — badge just stays stale
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    const interval = setInterval(refetch, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refetch]);

  return { count, refetch };
}

// ---------------------------------------------------------------------------
// useNotificationList — paginated list with filters
// ---------------------------------------------------------------------------

export function useNotificationList(filter: NotificationFilter = {}) {
  const [data, setData] = useState<Notification[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchKey = JSON.stringify(filter);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.set('type', filter.type);
      if (filter.isRead !== undefined) params.set('isRead', String(filter.isRead));
      params.set('page', String(filter.page ?? 1));
      params.set('pageSize', String(filter.pageSize ?? 20));

      const res = await api.get<PaginatedNotifications>(`/notifications?${params.toString()}`);
      setData(res.data);
      setMeta(res.meta);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, meta, loading, refetch };
}

// ---------------------------------------------------------------------------
// Action helpers
// ---------------------------------------------------------------------------

export async function markNotificationRead(id: string) {
  return api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return api.post('/notifications/mark-all-read');
}

// ---------------------------------------------------------------------------
// useNotificationPreferences
// ---------------------------------------------------------------------------

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<NotificationPreference[]>('/notifications/preferences');
      setPreferences(res);
    } catch {
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback(async (prefs: NotificationPreference[]) => {
    await api.put('/notifications/preferences', { preferences: prefs });
    setPreferences(prefs);
  }, []);

  return { preferences, loading, update, refetch };
}
