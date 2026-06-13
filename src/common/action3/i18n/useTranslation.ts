'use client';
import { useCallback } from 'react';
import { useUIPreferencesStore } from '~/common/stores/store-ui';
import { getMessage, Locale } from './index';

function resolveLocale(preferredLanguage: string | undefined | null): Locale {
  // Server: preferredLanguage is undefined (no store on server) -> default to 'zh'
  // Client: preferredLanguage persists from localStorage, e.g. 'zh-CN' -> 'zh'
  const lang = (preferredLanguage || 'zh-CN').split('-')[0];
  if (lang === 'en' || lang === 'ja' || lang === 'ko') return lang as Locale;
  return 'zh';
}

export function useTranslation() {
  const preferredLanguage = useUIPreferencesStore((s) => s.preferredLanguage);
  const locale = resolveLocale(preferredLanguage);

  const t = useCallback(
    (key: string): string => {
      return getMessage(locale, key);
    },
    [locale],
  );

  return { t, locale };
}
