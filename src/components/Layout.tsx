import type { ReactNode } from 'react';
import { useAppStore, type Page } from '../stores/appStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { t } from '../i18n';
import { Icon } from './Icon';

const NAV_ITEMS: { page: Page; icon: string; filledIcon?: string }[] = [
  { page: 'home', icon: 'home', filledIcon: 'home' },
  { page: 'report', icon: 'analytics' },
  { page: 'history', icon: 'fitness_center' },
  { page: 'settings', icon: 'person' },
];

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { page, setPage, lang } = useAppStore();
  const setSessionType = useAnalysisStore((s) => s.setSessionType);
  const tr = t(lang);

  const navLabels: Record<string, string> = {
    home: tr.nav.home,
    report: tr.nav.history,
    history: 'Exercises',
    settings: 'Profile',
  };

  const handleScanFAB = () => {
    setSessionType('quick');
    setPage('analysis');
  };

  return (
    <div className="flex flex-col h-full bg-bg-light dark:bg-bg-dark">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-lg pb-safe">
        <div className="flex items-center justify-between px-4 pt-2 pb-3 max-w-lg mx-auto">
          {/* Left nav items */}
          {NAV_ITEMS.slice(0, 2).map(({ page: p, icon }) => {
            const isActive = page === p;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex flex-1 flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'
                }`}
              >
                <Icon name={icon} filled={isActive} />
                <span className="text-[10px] font-medium">{navLabels[p]}</span>
              </button>
            );
          })}

          {/* FAB - center scan button */}
          <div className="relative -top-5 mx-2">
            <button
              onClick={handleScanFAB}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
            >
              <Icon name="qr_code_scanner" size={24} />
            </button>
          </div>

          {/* Right nav items */}
          {NAV_ITEMS.slice(2).map(({ page: p, icon }) => {
            const isActive = page === p;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex flex-1 flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500 hover:text-primary'
                }`}
              >
                <Icon name={icon} filled={isActive} />
                <span className="text-[10px] font-medium">{navLabels[p]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
