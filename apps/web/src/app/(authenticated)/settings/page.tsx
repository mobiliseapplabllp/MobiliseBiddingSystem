'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Save, Loader2, Lock, Shield, Monitor, Check } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import {
  useNotificationPreferences,
  type NotificationType,
} from '@/hooks/useNotifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

type Tab = 'general' | 'notifications' | 'security';

// Notification type groups for the preferences table
const NOTIF_GROUPS: { labelKey: string; types: NotificationType[] }[] = [
  { labelKey: 'categoryEvents', types: ['EVENT_PUBLISHED', 'BID_RECEIVED'] },
  { labelKey: 'categoryAuctions', types: ['AUCTION_STARTED', 'AUCTION_CLOSED', 'AUCTION_BID_PLACED'] },
  { labelKey: 'categoryEvaluations', types: ['EVALUATION_ASSIGNED', 'EVALUATION_COMPLETED'] },
  { labelKey: 'categoryAwards', types: ['AWARD_APPROVED', 'AWARD_REJECTED'] },
  { labelKey: 'categoryContracts', types: ['CONTRACT_CREATED', 'CONTRACT_EXPIRING', 'CONTRACT_ACTIVATED'] },
  { labelKey: 'categorySuppliers', types: ['SUPPLIER_REGISTERED', 'SUPPLIER_APPROVED'] },
  { labelKey: 'categoryOther', types: ['REMINDER', 'SYSTEM'] },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { user, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const tabs: { key: Tab; label: string; icon: typeof Sun }[] = [
    { key: 'general', label: t('tabs.general'), icon: Monitor },
    { key: 'notifications', label: t('tabs.notifications'), icon: Shield },
    { key: 'security', label: t('tabs.security'), icon: Lock },
  ];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-page-title text-text-primary">{t('title')}</h1>
        <p className="text-text-muted text-body mt-1">{t('subtitle')}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && <GeneralTab user={user} refresh={refresh} />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security' && <SecurityTab user={user} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// General Tab
// ---------------------------------------------------------------------------

function GeneralTab({ user, refresh }: { user: ReturnType<typeof useAuth>['user']; refresh: () => void }) {
  const t = useTranslations('settings');
  const [theme, setTheme] = useState(user?.preferredTheme ?? 'light');
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('preferredTimezone') ?? 'UTC';
    return 'UTC';
  });
  const [dateFormat, setDateFormat] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('preferredDateFormat') ?? 'DD/MM/YYYY';
    return 'DD/MM/YYYY';
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save theme to API
      await api.patch('/auth/preferences', { theme });
      // Save timezone & date format to localStorage
      localStorage.setItem('preferredTimezone', timezone);
      localStorage.setItem('preferredDateFormat', dateFormat);
      // Apply theme class
      document.documentElement.classList.toggle('dark', theme === 'dark');
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('general.theme')}</h3>
        <p className="text-[12px] text-text-muted mb-4">{t('general.themeDescription')}</p>
        <div className="flex items-center gap-2">
          {[
            { key: 'light', label: t('general.light'), icon: Sun },
            { key: 'dark', label: t('general.dark'), icon: Moon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-all ${
                theme === key
                  ? 'border-accent bg-accent/5 text-accent shadow-sm'
                  : 'border-border text-text-secondary hover:border-accent/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {theme === key && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('general.timezone')}</h3>
        <p className="text-[12px] text-text-muted mb-4">{t('general.timezoneDescription')}</p>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full max-w-sm px-3 py-2.5 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Date Format */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('general.dateFormat')}</h3>
        <p className="text-[12px] text-text-muted mb-4">{t('general.dateFormatDescription')}</p>
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          className="w-full max-w-sm px-3 py-2.5 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        >
          {DATE_FORMATS.map((fmt) => (
            <option key={fmt} value={fmt}>{fmt}</option>
          ))}
        </select>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t('notifications.saving') : saved ? t('general.saved') : t('notifications.save')}
        </button>
        {saved && (
          <span className="text-[12px] text-success font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            {t('general.saved')}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications Tab
// ---------------------------------------------------------------------------

function NotificationsTab() {
  const t = useTranslations('settings');
  const { preferences, loading, update } = useNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (preferences.length > 0) setLocalPrefs(preferences);
  }, [preferences]);

  const togglePref = (type: NotificationType, channel: 'email' | 'inApp') => {
    setLocalPrefs((prev) =>
      prev.map((p) =>
        p.type === type ? { ...p, [channel]: !p[channel] } : p,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(localPrefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-subtle rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[14px] font-semibold text-text-primary">{t('notifications.title')}</h3>
          <p className="text-[12px] text-text-muted mt-0.5">{t('notifications.description')}</p>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2.5 bg-bg-subtle/50 border-b border-border text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          <span />
          <span className="text-center">{t('notifications.emailColumn')}</span>
          <span className="text-center">{t('notifications.inAppColumn')}</span>
        </div>

        {/* Notification groups */}
        {NOTIF_GROUPS.map((group) => (
          <div key={group.labelKey}>
            {/* Group header */}
            <div className="px-5 py-2 bg-bg-subtle/30 border-b border-border">
              <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wide">
                {t(`notifications.${group.labelKey}`)}
              </span>
            </div>

            {/* Type rows */}
            {group.types.map((type) => {
              const pref = localPrefs.find((p) => p.type === type);
              return (
                <div
                  key={type}
                  className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-border last:border-b-0 items-center hover:bg-bg-subtle/30 transition-colors"
                >
                  <span className="text-[13px] text-text-primary">{t(`notifications.${type}`)}</span>
                  <div className="flex justify-center">
                    <button
                      onClick={() => togglePref(type, 'email')}
                      className={`h-5 w-9 rounded-full transition-colors relative ${
                        pref?.email ? 'bg-accent' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                          pref?.email ? 'start-[18px]' : 'start-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => togglePref(type, 'inApp')}
                      className={`h-5 w-9 rounded-full transition-colors relative ${
                        pref?.inApp ? 'bg-accent' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                          pref?.inApp ? 'start-[18px]' : 'start-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t('notifications.saving') : t('notifications.save')}
        </button>
        {saved && (
          <span className="text-[12px] text-success font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            {t('notifications.saveSuccess')}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security Tab
// ---------------------------------------------------------------------------

function SecurityTab({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const t = useTranslations('settings');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const passwordMismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('security.changePassword')}</h3>
        <p className="text-[12px] text-text-muted mb-4">{t('security.changePasswordDescription')}</p>

        <div className="space-y-3 max-w-sm">
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t('security.currentPassword')}</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t('security.newPassword')}</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] bg-bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-secondary mb-1 block">{t('security.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className={`w-full px-3 py-2.5 text-[13px] bg-bg-surface border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                passwordMismatch ? 'border-error' : 'border-border focus:border-accent'
              }`}
            />
            {passwordMismatch && (
              <p className="text-[11px] text-error mt-1">{t('security.passwordMismatch')}</p>
            )}
          </div>
          <button
            disabled
            className="btn-primary opacity-50 cursor-not-allowed flex items-center gap-2 mt-2"
            title={t('security.comingSoon')}
          >
            <Lock className="h-4 w-4" />
            {t('security.updatePassword')}
            <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold">{t('security.comingSoon')}</span>
          </button>
        </div>
      </div>

      {/* MFA Status */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('security.mfaStatus')}</h3>
        <p className="text-[12px] text-text-muted mb-3">{t('security.mfaDescription')}</p>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-text-muted" />
          <span className={`text-[13px] font-semibold ${user?.mfaEnabled ? 'text-success' : 'text-text-muted'}`}>
            {user?.mfaEnabled ? t('security.mfaEnabled') : t('security.mfaDisabled')}
          </span>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-text-primary mb-1">{t('security.activeSessions')}</h3>
        <p className="text-[12px] text-text-muted mb-3">{t('security.activeSessionsDescription')}</p>
        <div className="flex items-center gap-3 p-3 bg-bg-subtle rounded-lg">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Monitor className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-text-primary">{t('security.currentSession')}</p>
            <p className="text-[11px] text-text-muted">{t('security.lastActive', { time: 'now' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
