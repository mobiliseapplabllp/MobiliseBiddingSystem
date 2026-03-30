'use client';

import { useAuth } from '@/lib/auth-context';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';

interface RoleGateProps {
  /** Allowed roles — user must have at least one */
  roles: string[];
  /** Content to render when authorized */
  children: React.ReactNode;
  /** Optional fallback when unauthorized (defaults to access denied card) */
  fallback?: React.ReactNode;
}

/**
 * RoleGate — wraps page content and only renders children if the user has
 * one of the specified roles. Shows a friendly "Access Denied" card otherwise.
 *
 * Usage:
 *   <RoleGate roles={['PLATFORM_ADMIN', 'ORG_ADMIN']}>
 *     <OrganisationsPage />
 *   </RoleGate>
 */
export function RoleGate({ roles, children, fallback }: RoleGateProps) {
  const t = useTranslations('common');
  const { hasAnyRole, isPlatformAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin me-3" />
        {t('loading')}
      </div>
    );
  }

  // Platform admins always pass
  if (isPlatformAdmin || hasAnyRole(...roles)) {
    return <>{children}</>;
  }

  // Unauthorized
  if (fallback) return <>{fallback}</>;

  return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('accessDenied')}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {t('accessDeniedPermissions')}
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          {t('returnToDashboard')}
        </a>
      </div>
    </div>
  );
}
