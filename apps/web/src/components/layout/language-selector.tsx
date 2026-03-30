'use client';

import { useState } from 'react';
import { Globe, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from '@/hooks/useTranslations';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
];

interface LanguageSelectorProps {
  currentLocale?: string;
  onClose?: () => void;
}

export function LanguageSelector({ currentLocale = 'en', onClose }: LanguageSelectorProps) {
  const t = useTranslations('common');
  const { refresh } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [selected, setSelected] = useState(currentLocale);

  async function handleSelect(code: string) {
    if (code === selected) return;
    setSaving(code);
    try {
      await api.patch('/auth/preferences', { locale: code });
      setSelected(code);
      // Store in localStorage + cookie for next-intl to pick up
      localStorage.setItem('preferredLocale', code);
      document.cookie = `preferredLocale=${code}; path=/; max-age=${365 * 24 * 3600}; SameSite=Strict`;
      // Set dir attribute for RTL
      const lang = LANGUAGES.find((l) => l.code === code);
      document.documentElement.setAttribute('lang', code);
      if (lang?.rtl) {
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
      }
      await refresh();
      onClose?.();
      // Reload to apply new locale
      window.location.reload();
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="py-2">
      <div className="px-4 pb-2">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          {t('language', 'Language')}
        </p>
      </div>
      <div className="max-h-[240px] overflow-y-auto">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          const isSaving = saving === lang.code;
          const isAvailable = lang.code === 'en'; // Only English has translation file
          return (
            <button
              key={lang.code}
              onClick={() => isAvailable && handleSelect(lang.code)}
              disabled={!isAvailable || isSaving}
              className={`w-full flex items-center gap-3 px-4 py-2 text-start transition-colors ${
                isSelected ? 'bg-blue-50' : isAvailable ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                  {lang.name}
                </p>
                <p className="text-[11px] text-gray-400">{lang.nativeName}</p>
              </div>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
              {isSelected && !isSaving && <Check className="h-3.5 w-3.5 text-blue-600" />}
              {!isAvailable && !isSelected && (
                <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {t('comingSoon', 'Coming Soon')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
