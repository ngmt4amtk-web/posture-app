import { useAppStore } from '../stores/appStore';
import { useHistoryStore } from '../stores/historyStore';
import { t } from '../i18n';
import { TrendChart } from '../components/TrendChart';

export function History() {
  const { lang, setPage } = useAppStore();
  const { sessions, deleteSession, selectSession } = useHistoryStore();
  const tr = t(lang);

  const handleView = (session: typeof sessions[0]) => {
    selectSession(session);
    setPage('report');
  };

  const handleDelete = async (id: string) => {
    if (confirm(tr.history.deleteConfirm)) {
      await deleteSession(id);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.history.title}</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4 opacity-30">📊</div>
          <p className="text-gray-500 dark:text-gray-400">{tr.history.noData}</p>
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          {sessions.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{tr.history.trend}</h3>
              <TrendChart sessions={sessions.slice(0, 14)} />
            </div>
          )}

          {/* Session List */}
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-4"
              >
                <div className={`text-2xl font-bold ${scoreColor(session.overallScore)}`}>
                  {session.overallScore}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.type === 'quick' ? '⚡ Quick' : '🔍 Full'}
                    {session.angle === 'both' ? ' (F+S)' : ' (F)'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(session.timestamp).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(session)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  >
                    {tr.history.detail}
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  >
                    {tr.history.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
