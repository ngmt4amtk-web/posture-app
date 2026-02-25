import { useAppStore } from '../stores/appStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProfileStore } from '../stores/profileStore';
import { t } from '../i18n';
import { ScoreRing } from '../components/ScoreRing';
import { TrendChart } from '../components/TrendChart';
import { Icon } from '../components/Icon';
import { getScoreTier } from '../analysis/postureType';

export function Home() {
  const { lang, setPage } = useAppStore();
  const setSessionType = useAnalysisStore((s) => s.setSessionType);
  const sessions = useHistoryStore((s) => s.sessions);
  const profile = useProfileStore((s) => s.profile);
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

  const tier = latest ? getScoreTier(latest.overallScore) : null;
  const tierTr = tier ? tr.scoreTier[tier] : null;

  return (
    <div className="flex flex-col gap-6 p-4 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="person" className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back,</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{profile?.name || 'User'}</h1>
          </div>
        </div>
        <button
          onClick={() => setPage('settings')}
          className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Icon name="notifications" className="text-slate-900 dark:text-white" />
        </button>
      </header>

      {/* Score Ring */}
      <section className="flex flex-col items-center py-4">
        {latest ? (
          <>
            <ScoreRing score={latest.overallScore} label={tr.home.title} />
            <div className="mt-4 text-center">
              <p className="text-slate-900 dark:text-white font-medium">{tierTr?.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{tierTr?.comment}</p>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-48 h-48 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Icon name="accessibility_new" className="text-slate-300 dark:text-slate-600" size={64} />
            </div>
            <p className="text-slate-500 dark:text-slate-400">{tr.home.noData}</p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 px-1">Quick Actions</h3>
        <div className="flex flex-col gap-3">
          {/* Quick Scan */}
          <button
            onClick={startQuick}
            className="relative overflow-hidden group rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 transition-transform active:scale-[0.98] text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-primary shrink-0">
              <Icon name="bolt" size={28} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white">{tr.home.quickScan}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tr.home.quickDesc}</p>
            </div>
            <div className="bg-primary hover:bg-primary-dark text-white rounded-lg p-2 transition-colors">
              <Icon name="arrow_forward" />
            </div>
          </button>

          {/* Full Assessment */}
          <button
            onClick={startFull}
            className="relative overflow-hidden group rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 transition-transform active:scale-[0.98] text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Icon name="biotech" size={28} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white">{tr.home.fullAssessment}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tr.home.fullDesc}</p>
            </div>
            <div className="bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-2 transition-colors">
              <Icon name="arrow_forward" />
            </div>
          </button>
        </div>
      </section>

      {/* 7-Day Trend */}
      {last7.length >= 1 && (
        <section>
          <TrendChart sessions={last7} />
        </section>
      )}

      {/* Daily Tip */}
      <section className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 flex gap-4 items-start">
        <div className="bg-white dark:bg-indigo-800 p-2 rounded-full text-primary">
          <Icon name="lightbulb" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Daily Tip</h4>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
            {lang === 'ja'
              ? 'モニターを目の高さに合わせると、首への負担が減ります。背骨が喜びますよ！'
              : "Keep your monitor at eye level to reduce neck strain. Your spine will thank you later!"
            }
          </p>
        </div>
      </section>
    </div>
  );
}
