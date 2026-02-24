import { useAppStore } from '../stores/appStore';
import { useHistoryStore } from '../stores/historyStore';
import { t } from '../i18n';
import { ScoreRing } from '../components/ScoreRing';
import { MetricCard } from '../components/MetricCard';
import { getRecommendedExercises, getMetricAdviceKey } from '../analysis/advice';
import type { PostureMetrics } from '../db';

type MetricKey = keyof PostureMetrics;

const METRIC_ORDER: MetricKey[] = [
  'cva', 'headTilt', 'shoulderLevel', 'roundedShoulders',
  'thoracicKyphosis', 'lumbarLordosis', 'pelvicTilt', 'trunkLean', 'kneeHyperextension',
];

export function Report() {
  const { lang, setPage } = useAppStore();
  const session = useHistoryStore((s) => s.selectedSession);
  const tr = t(lang);

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">{tr.home.noData}</p>
        <button onClick={() => setPage('home')} className="mt-4 text-primary-500">{tr.report.backHome}</button>
      </div>
    );
  }

  const { metrics, overallScore } = session;
  const exercises = getRecommendedExercises(metrics);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr.report.title}</h1>

      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center relative">
        <h2 className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tr.report.overall}</h2>
        <ScoreRing score={overallScore} size={180} />
        <p className="text-xs text-gray-400 mt-2">
          {new Date(session.timestamp).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}
        </p>
      </div>

      {/* Metric Details */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{tr.report.metrics}</h2>
        <div className="space-y-3">
          {METRIC_ORDER.map((key) => {
            const m = metrics[key];
            if (!m) return null;
            const metricTr = tr.metrics[key as keyof typeof tr.metrics];
            if (!metricTr || !('name' in metricTr)) return null;
            const adviceKey = getMetricAdviceKey(m.status);
            const adviceTr = tr.advice[key as keyof typeof tr.advice];
            const adviceText = adviceTr ? adviceTr[adviceKey] : undefined;
            return (
              <MetricCard
                key={key}
                name={metricTr.name}
                desc={metricTr.desc}
                ref_text={'ref' in metricTr ? metricTr.ref : ''}
                metric={m}
                adviceText={adviceText}
              />
            );
          })}
        </div>
      </div>

      {/* Exercises */}
      {exercises.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{tr.report.exercise}</h2>
          <div className="space-y-2">
            {exercises.map((exKey) => {
              const ex = tr.exercises[exKey as keyof typeof tr.exercises];
              if (!ex) return null;
              return (
                <div key={exKey} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{ex.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ex.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={() => setPage('home')}
          className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold"
        >
          {tr.report.backHome}
        </button>
        <button
          onClick={() => setPage('analysis')}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold"
        >
          {tr.report.newScan}
        </button>
      </div>
    </div>
  );
}
