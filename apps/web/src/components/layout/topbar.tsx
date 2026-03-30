'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown, Bell, Search, Settings, User, Gavel, Menu, Globe } from 'lucide-react';
import { logout } from '@/lib/auth';
import { useSidebar } from './sidebar-context';
import { useAuth, getRoleLabel, PERMISSIONS } from '@/lib/auth-context';
import { SimulateSelector } from './simulate-selector';
import { LanguageSelector } from './language-selector';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useTranslations } from '@/hooks/useTranslations';

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export function Topbar() {
  const t = useTranslations('topbar');
  const router = useRouter();
  const { user, primaryRole, hasPermission } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { toggle } = useSidebar();
  const { count: unreadCount, refetch: refetchUnread } = useUnreadCount();

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const roleDisplay = primaryRole ? getRoleLabel(primaryRole) : '—';

  // Show org/user switcher if user has USER_IMPERSONATE permission OR is mapped to multiple orgs
  const uniqueOrgIds = new Set(user?.roles?.map((r) => r.orgId) ?? []);
  const showSwitcher = hasPermission(PERMISSIONS.USER_IMPERSONATE) || uniqueOrgIds.size > 1;

  return (
    <header className="fixed top-0 start-0 end-0 h-[60px] bg-bg-surface border-b border-border flex items-center gap-3 px-3 lg:px-4 z-50">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        aria-label="Toggle sidebar"
        className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors shrink-0"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo + App identity */}
      <div className="flex items-center gap-2.5 shrink-0 lg:w-[240px] lg:border-e lg:border-border lg:pe-4">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}
        >
          <Gavel className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-[14px] text-text-primary leading-tight tracking-tight">eSourcing</p>
          <p className="text-[10px] text-text-muted leading-none tracking-wider uppercase">Platform</p>
        </div>
      </div>

      {/* Search bar — hidden on mobile */}
      <div className="hidden md:block flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full ps-9 pe-12 py-2 text-[13.5px] bg-bg-subtle border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
          <kbd className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-muted bg-bg-surface border border-border px-1.5 py-0.5 rounded pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right actions */}
      <div className="ms-auto flex items-center gap-1">
        {/* Mobile search button */}
        <button aria-label="Search" className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors">
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); setMenuOpen(false); }}
            aria-label={t('notifications')}
            className="relative h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 h-4 min-w-[16px] px-0.5 rounded-full bg-error text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            onCountChange={refetchUnread}
          />
        </div>

        {/* Language globe */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); setMenuOpen(false); }}
            aria-label={t('languageTooltip')}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors"
          >
            <Globe className="h-[18px] w-[18px]" />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute end-0 top-full mt-1.5 z-50">
                <LanguageSelector
                  currentLocale={user?.preferredLocale ?? 'en'}
                  onClose={() => setLangOpen(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Settings — hidden on small mobile */}
        <button
          onClick={() => router.push('/settings')}
          aria-label={t('settings')}
          className="hidden sm:flex h-9 w-9 rounded-lg items-center justify-center text-text-muted hover:bg-bg-subtle transition-colors"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>

        {/* Org/User Switcher — shown if user has USER_IMPERSONATE or multi-org */}
        {showSwitcher && (
          <>
            <div className="hidden sm:block h-6 w-px bg-border mx-1" />
            <SimulateSelector />
          </>
        )}

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-border mx-2" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); setLangOpen(false); }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-subtle transition-colors"
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}
            >
              {initials}
            </div>
            <div className="hidden lg:block text-start">
              <p className="text-[13px] font-semibold text-text-primary leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </p>
              <p className="text-[11px] text-text-muted leading-tight">{roleDisplay}</p>
            </div>
            <ChevronDown
              className={`hidden lg:block h-3.5 w-3.5 text-text-muted transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute end-0 top-full mt-1.5 w-64 bg-bg-surface border border-border rounded-xl shadow-lg z-50">
                {/* Profile header */}
                <div className="px-4 py-3.5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:bg-bg-subtle hover:text-text-primary transition-colors"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    {t('profileSettings')}
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/settings'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-text-secondary hover:bg-bg-subtle hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {t('preferences')}
                  </button>
                </div>

                <div className="py-1.5 border-t border-border">
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-error hover:bg-error/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {t('signOut')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
