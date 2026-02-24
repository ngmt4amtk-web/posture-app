import type { ReactNode } from 'react';
import { useAppStore, type Page } from '../stores/appStore';
import { t } from '../i18n';

const NAV_ITEMS: { page: Page; icon: string }[] = [
  { page: 'home', icon: '🏠' },
  { page: 'analysis', icon: '📷' },
  { page: 'history', icon: '📊' },
  { page: 'settings', icon: '⚙️' },
];

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { page, setPage, lang } = useAppStore();
  const tr = t(lang);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 safe-area-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          {NAV_ITEMS.map(({ page: p, icon }) => {
            const isActive = page === p;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex flex-col items-center py-2 px-4 text-xs transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span className="text-xl mb-0.5">{icon}</span>
                <span>{tr.nav[p as keyof typeof tr.nav]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
