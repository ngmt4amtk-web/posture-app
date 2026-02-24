import { useAppStore } from '../stores/appStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { useHistoryStore } from '../stores/historyStore';
import { t } from '../i18n';
import { ScoreRing } from '../components/ScoreRing';
import { TrendChart } from '../components/TrendChart';

export function Home() {
  const { lang, setPage } = useAppStore();
  const setSessionType = useAnalysisStore((s) => s.setSessionType);
  const sessions = useHistoryStore((s) => s.sessions);
  const tr = t(lang);

  const latest = sessions[0];
  const last7 = sessions.filter((s) => {
    const d = new Date(s.timestamp);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  const startQuick = () => {
    setSessionType('quick');
    setPage('analysis');
  };

  const startFull = () => {
    setSessionType('full');
    setPage('analysis');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.app.name}</h1>

      {/* Score display */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center relative">
        <h2 className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tr.home.title}</h2>
        {latest ? (
          <>
            <ScoreRing score={latest.overallScore} />
            <p className="text-xs text-gray-400 mt-2">
              {tr.home.lastMeasured}: {new Date(latest.timestamp).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US')}
            </p>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="text-5xl mb-4 opacity-30">🧍</div>
            <p className="text-gray-500 dark:text-gray-400">{tr.home.noData}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startQuick}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-xl p-4 text-left transition-colors"
        >
          <span className="text-2xl block mb-2">⚡</span>
          <span className="font-semibold block">{tr.home.quickScan}</span>
          <span className="text-xs opacity-80 block mt-1">{tr.home.quickDesc}</span>
        </button>
        <button
          onClick={startFull}
          className="bg-primary-700 hover:bg-primary-800 text-white rounded-xl p-4 text-left transition-colors"
        >
          <span className="text-2xl block mb-2">🔍</span>
          <span className="font-semibold block">{tr.home.fullAssessment}</span>
          <span className="text-xs opacity-80 block mt-1">{tr.home.fullDesc}</span>
        </button>
      </div>

      {/* Trend */}
      {last7.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{tr.home.trend}</h3>
          <TrendChart sessions={last7} />
        </div>
      )}
    </div>
  );
}
