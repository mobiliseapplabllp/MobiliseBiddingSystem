'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Loader2, UserCircle, Shield } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/hooks/useTranslations';

interface Org { id: string; name: string; subdomain: string }
interface SimUser { id: string; email: string; firstName: string; lastName: string; roles: string[] }

const ROLE_BADGE: Record<string, string> = {
  PLATFORM_ADMIN: 'bg-red-100 text-red-700',
  ORG_ADMIN: 'bg-blue-100 text-blue-700',
  BU_HEAD: 'bg-amber-100 text-amber-700',
  EVENT_MANAGER: 'bg-emerald-100 text-emerald-700',
  BUYER: 'bg-indigo-100 text-indigo-700',
  EVALUATOR: 'bg-cyan-100 text-cyan-700',
  OBSERVER: 'bg-gray-100 text-gray-600',
  SUPPLIER: 'bg-violet-100 text-violet-700',
};

export function SimulateSelector() {
  const t = useTranslations('topbar');
  const { user, refresh } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<SimUser[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Load orgs when dropdown opens
  useEffect(() => {
    if (isOpen && orgs.length === 0) {
      setLoading(true);
      api.get<Org[]>('/auth/simulate/orgs')
        .then(setOrgs)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, orgs.length]);

  // Load users when org selected
  useEffect(() => {
    if (!selectedOrgId) { setUsers([]); return; }
    setLoading(true);
    api.get<SimUser[]>(`/auth/simulate/orgs/${selectedOrgId}/users`)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [selectedOrgId]);

  async function handleSwitch(userId: string) {
    setSwitching(userId);
    try {
      const result = await api.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
        '/auth/simulate', { userId },
      );
      api.setToken(result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      document.cookie = `access_token=${result.accessToken}; path=/; max-age=${result.expiresIn ?? 3600}; SameSite=Strict`;
      setIsOpen(false);
      // Full page reload to reset all state (sidebar, auth context, page data)
      window.location.href = '/dashboard';
    } catch {
      setSwitching(null);
    }
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
          isOpen ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline text-[13px] font-medium max-w-[120px] truncate">
          {selectedOrg?.name || t('switch')}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute end-0 top-full mt-1.5 w-[340px] bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('switchOrgUser')}</p>
            </div>

            {/* Org selector */}
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                {t('organisation')}
              </label>
              {loading && orgs.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-gray-400 text-[13px]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                </div>
              ) : (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                >
                  <option value="">{t('selectOrganisation')}</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Users list */}
            {selectedOrgId && (
              <div className="max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin me-2" /> {t('loadingUsers')}
                  </div>
                ) : users.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] text-gray-400">{t('noUsersFound')}</div>
                ) : (
                  <div className="py-1">
                    {users.map((u) => {
                      const isCurrentUser = user?.id === u.id;
                      const isSwitching = switching === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => !isCurrentUser && handleSwitch(u.id)}
                          disabled={isCurrentUser || !!switching}
                          className={`w-full text-start px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            isCurrentUser
                              ? 'bg-blue-50 cursor-default'
                              : switching ? 'opacity-50 cursor-wait' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            {isSwitching ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                              <UserCircle className={`h-4 w-4 ${isCurrentUser ? 'text-blue-600' : 'text-gray-400'}`} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-medium truncate ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                                {u.firstName} {u.lastName}
                              </p>
                              {isCurrentUser && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{t('you')}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {u.roles.map((role) => (
                                <span key={role} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[role] || 'bg-gray-100 text-gray-600'}`}>
                                  {role.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <p className="text-[11px] text-gray-400">
                {user ? t('loggedInAs', { name: `${user.firstName} ${user.lastName}` }) : t('selectUserToSwitch')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
