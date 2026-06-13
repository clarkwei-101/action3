import zhMessages from './messages/zh.json';
import enMessages from './messages/en.json';
import jaMessages from './messages/ja.json';
import koMessages from './messages/ko.json';

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

export const messages: Record<Locale, Record<string, any>> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
  ko: koMessages,
};

export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

export const defaultLocale: Locale = 'zh';

export type MessageKey = string;

export function getMessage(locale: Locale, key: string): string {
  const keys = key.split('.');
  let result: any = messages[locale];
  for (const k of keys) {
    if (result == null || typeof result !== 'object') return key;
    result = result[k];
  }
  if (typeof result !== 'string') return key;
  return result;
}

export { useTranslation } from './useTranslation';
export { useUIPreferencesStore } from '~/common/stores/store-ui';
