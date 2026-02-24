import { ja } from './ja';
import { en } from './en';

export type Lang = 'ja' | 'en';

export type Translations = typeof ja;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Lang, Translations> = { ja, en: en as any };

export function t(lang: Lang): Translations {
  return translations[lang];
}

export function detectLang(): Lang {
  const stored = localStorage.getItem('posture-lang');
  if (stored === 'ja' || stored === 'en') return stored;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}
