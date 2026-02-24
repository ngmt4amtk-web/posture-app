import { useAppStore, type Theme } from '../stores/appStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProfileStore } from '../stores/profileStore';
import { t, type Lang } from '../i18n';

export function Settings() {
  const { lang, setLang, theme, setTheme } = useAppStore();
  const { clearAll } = useHistoryStore();
  const { init: reinitProfile } = useProfileStore();
  const tr = t(lang);

  const handleClear = async () => {
    if (confirm(tr.settings.clearConfirm)) {
      await clearAll();
      await reinitProfile();
    }
  };

  const themes: { value: Theme; label: string }[] = [
    { value: 'light', label: tr.settings.light },
    { value: 'dark', label: tr.settings.dark },
    { value: 'system', label: tr.settings.system },
  ];

  const langs: { value: Lang; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.settings.title}</h1>

      {/* Language */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{tr.settings.language}</h3>
        <div className="flex gap-2">
          {langs.map((l) => (
            <button
              key={l.value}
              onClick={() => setLang(l.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                lang === l.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{tr.settings.theme}</h3>
        <div className="flex gap-2">
          {themes.map((th) => (
            <button
              key={th.value}
              onClick={() => setTheme(th.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === th.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{tr.settings.about}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{tr.settings.aboutText}</p>
        <p className="text-xs text-gray-400 mt-2">{tr.settings.version}: 1.0.0</p>
      </div>

      {/* Clear Data */}
      <button
        onClick={handleClear}
        className="w-full py-3 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        {tr.settings.clearData}
      </button>
    </div>
  );
}
