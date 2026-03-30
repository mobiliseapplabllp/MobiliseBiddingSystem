'use client';

import Link from 'next/link';
import { Settings, Globe, Sun, Moon, Mail, Building2, Users, Calendar, Shield, ArrowRight } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth, getRoleLabel } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Language flag mapping
// ---------------------------------------------------------------------------

const LOCALE_FLAGS: Record<string, { flag: string; name: string }> = {
  en: { flag: '🇬🇧', name: 'English' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fr: { flag: '🇫🇷', name: 'French' },
  es: { flag: '🇪🇸', name: 'Spanish' },
  de: { flag: '🇩🇪', name: 'German' },
  zh: { flag: '🇨🇳', name: 'Chinese' },
  hi: { flag: '🇮🇳', name: 'Hindi' },
  pt: { flag: '🇧🇷', name: 'Portuguese' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, primaryRole } = useAuth();

  if (!user) {
    return (
      <div className="max-w-3xl animate-pulse space-y-6">
        <div className="h-40 bg-bg-subtle rounded-lg" />
        <div className="h-60 bg-bg-subtle rounded-lg" />
      </div>
    );
  }

  const locale = user.preferredLocale ?? 'en';
  const localeInfo = LOCALE_FLAGS[locale] ?? LOCALE_FLAGS.en;
  const theme = user.preferredTheme ?? 'light';
  const roleDisplay = primaryRole ? getRoleLabel(primaryRole) : '—';
  const primaryRoleObj = user.roles?.[0];

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-page-title text-text-primary">{t('title')}</h1>
        <p className="text-text-muted text-body mt-1">{t('subtitle')}</p>
      </div>

      {/* Profile card */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card overflow-hidden mb-6">
        {/* Gradient banner */}
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)' }}>
          <div className="absolute -bottom-10 start-6">
            <div className="h-20 w-20 rounded-xl flex items-center justify-center text-[24px] font-bold text-white border-4 border-bg-surface shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #6366F1 100%)' }}
            >
              {initials}
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-text-primary">{user.firstName} {user.lastName}</h2>
              <p className="text-[13px] text-text-muted mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/10 text-accent">
                  <Shield className="h-3 w-3" />
                  {roleDisplay}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${
                  user.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}>
                  {user.status === 'ACTIVE' ? t('active') : t('inactive')}
                </span>
              </div>
            </div>
            <Link
              href="/settings"
              className="btn-secondary flex items-center gap-2 text-[12px]"
            >
              <Settings className="h-3.5 w-3.5" />
              {t('goToSettings')}
            </Link>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[14px] font-semibold text-text-primary">{t('accountInfo')}</h3>
        </div>
        <div className="divide-y divide-border">
          <InfoRow icon={Mail} label={t('email')} value={user.email} />
          <InfoRow icon={Shield} label={t('role')} value={roleDisplay} />
          <InfoRow
            icon={Building2}
            label={t('organisation')}
            value={primaryRoleObj?.orgName ?? '—'}
          />
          <InfoRow
            icon={Users}
            label={t('businessUnit')}
            value={primaryRoleObj?.buName ?? '—'}
          />
          <InfoRow
            icon={Calendar}
            label={t('memberSince')}
            value={user.createdAt ? formatDate(user.createdAt) : '—'}
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-bg-surface border border-border rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[14px] font-semibold text-text-primary">{t('preferences')}</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-text-primary">{t('language')}</p>
                <p className="text-[12px] text-text-muted">{localeInfo.flag} {localeInfo.name}</p>
              </div>
            </div>
            <span className="text-[12px] text-text-muted">{t('changeLanguage')}</span>
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-warning" />
                ) : (
                  <Sun className="h-4 w-4 text-warning" />
                )}
              </div>
              <div>
                <p className="text-[13px] font-medium text-text-primary">{t('theme')}</p>
                <p className="text-[12px] text-text-muted capitalize">{theme}</p>
              </div>
            </div>
            <Link href="/settings" className="text-[12px] text-accent hover:text-accent-dark flex items-center gap-1 transition-colors">
              {t('changeTheme')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Info Row
// ---------------------------------------------------------------------------

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}
