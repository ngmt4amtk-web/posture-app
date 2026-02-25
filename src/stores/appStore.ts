import { create } from 'zustand';
import { type Lang, detectLang } from '../i18n';

export type Page = 'home' | 'analysis' | 'report' | 'history' | 'settings';
export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  page: Page;
  lang: Lang;
  theme: Theme;
  setPage: (page: Page) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('posture-theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'dark';
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export const useAppStore = create<AppState>((set) => {
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);

  return {
    page: 'home',
    lang: detectLang(),
    theme: initialTheme,
    setPage: (page) => set({ page }),
    setLang: (lang) => {
      localStorage.setItem('posture-lang', lang);
      set({ lang });
    },
    setTheme: (theme) => {
      localStorage.setItem('posture-theme', theme);
      applyTheme(theme);
      set({ theme });
    },
  };
});
