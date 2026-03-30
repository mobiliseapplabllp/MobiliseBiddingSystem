'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getProfile, isAuthenticated } from './auth';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface UserOrgRole {
  orgId: string;
  orgName: string;
  buId: string | null;
  buName: string | null;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: UserOrgRole[];
  permissions: string[]; // Resolved from role_permissions table
  preferredLocale: string;
  preferredTheme: string;
  mfaEnabled: boolean;
  createdAt: string;
}

// ── Role Constants ──────────────────────────────────────────────────────────────

export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  BU_HEAD: 'BU_HEAD',
  EVENT_MANAGER: 'EVENT_MANAGER',
  BUYER: 'BUYER',
  EVALUATOR: 'EVALUATOR',
  OBSERVER: 'OBSERVER',
  SUPPLIER: 'SUPPLIER',
} as const;

// ── Permission Constants ────────────────────────────────────────────────────────

export const PERMISSIONS = {
  ORG_CREATE: 'ORG_CREATE', ORG_UPDATE: 'ORG_UPDATE', ORG_VIEW: 'ORG_VIEW',
  BU_CREATE: 'BU_CREATE', BU_UPDATE: 'BU_UPDATE', BU_VIEW: 'BU_VIEW',
  USER_CREATE: 'USER_CREATE', USER_UPDATE: 'USER_UPDATE', USER_VIEW: 'USER_VIEW', USER_ASSIGN_ROLE: 'USER_ASSIGN_ROLE', USER_IMPERSONATE: 'USER_IMPERSONATE',
  EVENT_CREATE: 'EVENT_CREATE', EVENT_UPDATE: 'EVENT_UPDATE', EVENT_VIEW: 'EVENT_VIEW', EVENT_PUBLISH: 'EVENT_PUBLISH', EVENT_DELETE: 'EVENT_DELETE',
  AUCTION_CREATE: 'AUCTION_CREATE', AUCTION_START: 'AUCTION_START', AUCTION_CLOSE: 'AUCTION_CLOSE', AUCTION_VIEW: 'AUCTION_VIEW',
  BID_SUBMIT: 'BID_SUBMIT', BID_VIEW_OWN: 'BID_VIEW_OWN', BID_VIEW_ALL: 'BID_VIEW_ALL',
  EVAL_SCORE: 'EVAL_SCORE', EVAL_VIEW: 'EVAL_VIEW', EVAL_MANAGE: 'EVAL_MANAGE',
  AWARD_RECOMMEND: 'AWARD_RECOMMEND', AWARD_APPROVE: 'AWARD_APPROVE', AWARD_VIEW: 'AWARD_VIEW',
  CONTRACT_CREATE: 'CONTRACT_CREATE', CONTRACT_VIEW: 'CONTRACT_VIEW', CONTRACT_SIGN: 'CONTRACT_SIGN',
  SUPPLIER_VIEW: 'SUPPLIER_VIEW', SUPPLIER_MANAGE: 'SUPPLIER_MANAGE',
  ANALYTICS_VIEW: 'ANALYTICS_VIEW', ADMIN_SETTINGS: 'ADMIN_SETTINGS', ADMIN_AUDIT_LOG: 'ADMIN_AUDIT_LOG',
} as const;

// ── Page-to-Permission Mapping ──────────────────────────────────────────────────
// Maps routes to the permission(s) required. If ANY listed permission is held, access is granted.
// PLATFORM_ADMIN always bypasses this check.

const PAGE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard':    [], // All authenticated users
  '/events':       [PERMISSIONS.EVENT_VIEW, PERMISSIONS.EVENT_CREATE],
  '/auctions':     [PERMISSIONS.AUCTION_VIEW, PERMISSIONS.AUCTION_CREATE],
  '/evaluations':  [PERMISSIONS.EVAL_VIEW, PERMISSIONS.EVAL_SCORE, PERMISSIONS.EVAL_MANAGE],
  '/awards':       [PERMISSIONS.AWARD_VIEW, PERMISSIONS.AWARD_RECOMMEND, PERMISSIONS.AWARD_APPROVE],
  '/contracts':    [PERMISSIONS.CONTRACT_VIEW, PERMISSIONS.CONTRACT_CREATE, PERMISSIONS.CONTRACT_SIGN],
  '/templates':    [PERMISSIONS.EVENT_CREATE],
  '/deadlines':    [PERMISSIONS.EVENT_VIEW],
  '/suppliers':    [PERMISSIONS.SUPPLIER_VIEW, PERMISSIONS.SUPPLIER_MANAGE],
  '/analytics':    [PERMISSIONS.ANALYTICS_VIEW],
  '/admin/organisations':   [PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_CREATE, PERMISSIONS.ORG_UPDATE],
  '/admin/business-units':  [PERMISSIONS.BU_VIEW, PERMISSIONS.BU_CREATE, PERMISSIONS.BU_UPDATE],
  '/admin/users':           [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_ASSIGN_ROLE],
  '/admin/master-data':     [PERMISSIONS.ADMIN_SETTINGS],
  '/admin/dev-progress':    [PERMISSIONS.ADMIN_SETTINGS, PERMISSIONS.EVENT_VIEW],
  '/supplier':              [PERMISSIONS.BID_SUBMIT, PERMISSIONS.BID_VIEW_OWN],
};

// ── Context ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  primaryRole: string | null;
  /** Check if user has a specific role name */
  hasRole: (role: string) => boolean;
  /** Check if user has ANY of the specified roles */
  hasAnyRole: (...roles: string[]) => boolean;
  /** Check if user has a specific permission (from DB) */
  hasPermission: (permission: string) => boolean;
  /** Check if user has ANY of the specified permissions */
  hasAnyPermission: (...permissions: string[]) => boolean;
  /** Check if user can access a page (permission-based) */
  canAccess: (path: string) => boolean;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  isSupplier: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  primaryRole: null,
  hasRole: () => false,
  hasAnyRole: () => false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  canAccess: () => false,
  isPlatformAdmin: false,
  isOrgAdmin: false,
  isSupplier: false,
  refresh: async () => {},
});

// ── Provider ────────────────────────────────────────────────────────────────────

const ROLE_PRIORITY = [
  ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN, ROLES.BU_HEAD,
  ROLES.EVENT_MANAGER, ROLES.BUYER, ROLES.EVALUATOR,
  ROLES.OBSERVER, ROLES.SUPPLIER,
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await getProfile();
      setUser(profile as UserProfile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Derived helpers
  const roleNames = user?.roles?.map((r) => r.role) ?? [];
  const userPermissions = new Set(user?.permissions ?? []);
  const isPlatformAdmin = roleNames.includes(ROLES.PLATFORM_ADMIN);

  const hasRole = useCallback((role: string) => roleNames.includes(role), [roleNames]);
  const hasAnyRole = useCallback((...roles: string[]) => roles.some((r) => roleNames.includes(r)), [roleNames]);

  const hasPermission = useCallback(
    (permission: string) => isPlatformAdmin || userPermissions.has(permission),
    [isPlatformAdmin, userPermissions],
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]) => isPlatformAdmin || permissions.some((p) => userPermissions.has(p)),
    [isPlatformAdmin, userPermissions],
  );

  const canAccess = useCallback(
    (path: string) => {
      if (isPlatformAdmin) return true; // superadmin sees all

      // Find matching page-permission rule (longest prefix match)
      const matchingPaths = Object.keys(PAGE_PERMISSIONS)
        .filter((p) => path === p || path.startsWith(p + '/'))
        .sort((a, b) => b.length - a.length);

      if (matchingPaths.length === 0) return true; // No rule = allow
      const requiredPerms = PAGE_PERMISSIONS[matchingPaths[0]];
      if (requiredPerms.length === 0) return true; // Empty = all authenticated users

      // User needs ANY of the required permissions
      return requiredPerms.some((p) => userPermissions.has(p));
    },
    [isPlatformAdmin, userPermissions],
  );

  const primaryRole = ROLE_PRIORITY.find((r) => roleNames.includes(r)) ?? null;
  const isOrgAdmin = roleNames.includes(ROLES.ORG_ADMIN);
  const isSupplier = roleNames.includes(ROLES.SUPPLIER);

  return (
    <AuthContext.Provider
      value={{
        user, loading, primaryRole,
        hasRole, hasAnyRole, hasPermission, hasAnyPermission, canAccess,
        isPlatformAdmin, isOrgAdmin, isSupplier,
        refresh: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}

export function useRole() {
  const { primaryRole, hasRole, hasAnyRole, isPlatformAdmin, isOrgAdmin, isSupplier } = useContext(AuthContext);
  return { primaryRole, hasRole, hasAnyRole, isPlatformAdmin, isOrgAdmin, isSupplier };
}

export function usePermission() {
  const { hasPermission, hasAnyPermission } = useContext(AuthContext);
  return { hasPermission, hasAnyPermission };
}

export function useCanAccess(path: string): boolean {
  const { canAccess, loading } = useContext(AuthContext);
  if (loading) return false;
  return canAccess(path);
}

// ── Display Helpers ─────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  ORG_ADMIN: 'Org Admin',
  BU_HEAD: 'BU Head',
  EVENT_MANAGER: 'Event Manager',
  BUYER: 'Buyer',
  EVALUATOR: 'Evaluator',
  OBSERVER: 'Observer',
  SUPPLIER: 'Supplier',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}
