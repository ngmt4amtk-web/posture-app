import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useHistoryStore } from '../stores/historyStore';
import { t } from '../i18n';
import { MetricCard } from '../components/MetricCard';
import { Icon } from '../components/Icon';
import { getRecommendedExercises, getMetricAdviceKey } from '../analysis/advice';
import { diagnosePostureType, getScoreTier, getStabilityGrade } from '../analysis/postureType';
import type { PostureMetrics } from '../db';

type MetricKey = keyof PostureMetrics;

const METRIC_ORDER: MetricKey[] = [
  'cva', 'headTilt', 'shoulderLevel', 'roundedShoulders',
  'thoracicKyphosis', 'lumbarLordosis', 'pelvicTilt', 'trunkLean', 'kneeHyperextension',
];

const METRIC_CATEGORIES: Record<string, string> = {
  cva: 'Neck Alignment',
  headTilt: 'Head',
  shoulderLevel: 'Upper Body',
  roundedShoulders: 'Upper Body',
  thoracicKyphosis: 'Spine',
  lumbarLordosis: 'Spine',
  pelvicTilt: 'Lower Body',
  trunkLean: 'Core',
  kneeHyperextension: 'Lower Body',
};

const METRIC_ICONS: Record<string, string> = {
  cva: 'face',
  headTilt: 'face',
  shoulderLevel: 'accessibility_new',
  roundedShoulders: 'accessibility_new',
  thoracicKyphosis: 'straighten',
  lumbarLordosis: 'straighten',
  pelvicTilt: 'swap_vert',
  trunkLean: 'balance',
  kneeHyperextension: 'directions_walk',
};

export function Report() {
  const { lang, setPage } = useAppStore();
  const session = useHistoryStore((s) => s.selectedSession);
  const sessions = useHistoryStore((s) => s.sessions);
  const tr = t(lang);
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">{tr.home.noData}</p>
        <button onClick={() => setPage('home')} className="mt-4 text-primary">{tr.report.backHome}</button>
      </div>
    );
  }

  const { metrics, overallScore } = session;
  const postureType = diagnosePostureType(metrics, overallScore);
  const tier = getScoreTier(overallScore);
  const stability = getStabilityGrade(metrics);
  const exercises = getRecommendedExercises(metrics);
  const typeTr = tr.postureType[postureType];
  const tierTr = tr.scoreTier[tier];

  // Compute improvement from previous session
  const prevSession = sessions.find(s => s.id !== session.id);
  const improvement = prevSession
    ? overallScore - prevSession.overallScore
    : null;

  const visibleMetrics = showAllMetrics ? METRIC_ORDER : METRIC_ORDER.slice(0, 3);

  return (
    <div className="max-w-lg mx-auto flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center bg-white dark:bg-surface-dark p-4 pt-6 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800/50">
        <button
          onClick={() => setPage('home')}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Icon name="arrow_back" />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold">{tr.report.title}</h2>
        <div className="w-10" /> {/* spacer */}
      </div>

      <div className="flex-1 overflow-y-auto pb-24 space-y-6 p-4">
        {/* Summary Card — Gradient */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-[#4f51d8] to-[#3d3fb3] p-6 shadow-lg text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-xl" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{tr.report.overall}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <h1 className="text-6xl font-bold tracking-tighter">{overallScore}</h1>
              <span className="text-2xl font-medium text-white/70">/100</span>
            </div>
            {/* Progress badge */}
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md">
              <Icon name={improvement !== null && improvement > 0 ? 'trending_up' : 'check_circle'} size={16} />
              <span className="text-sm font-semibold">{tierTr.label}</span>
            </div>
            {/* Improvement or posture type text */}
            <p className="mt-3 text-center text-sm text-white/90 leading-relaxed max-w-[280px]">
              {improvement !== null && improvement !== 0
                ? (lang === 'ja'
                  ? `前回より${improvement > 0 ? '+' : ''}${improvement}点${improvement > 0 ? '改善' : ''}しました。${typeTr.tagline}`
                  : `${improvement > 0 ? '+' : ''}${improvement} points from last time. ${typeTr.tagline}`)
                : typeTr.tagline
              }
            </p>
          </div>
        </div>

        {/* Posture Type Mini Card */}
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <span className="text-3xl">{typeTr.emoji}</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.postureType.yourType}</p>
            <h3 className="font-bold text-slate-900 dark:text-white">{typeTr.name}</h3>
          </div>
          {/* Stability grade */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              stability.grade === 'A' ? 'text-emerald-500' :
              stability.grade === 'B' ? 'text-blue-500' :
              stability.grade === 'C' ? 'text-amber-500' : 'text-red-500'
            }`}>{stability.grade}</div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{tr.report.stability}</p>
          </div>
        </div>

        {/* Metric Details */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tr.report.metrics}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(session.timestamp).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US')}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {visibleMetrics.map((key) => {
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
                  category={lang === 'ja' ? metricTr.desc : METRIC_CATEGORIES[key]}
                  metric={m}
                  adviceText={adviceText}
                  icon={METRIC_ICONS[key]}
                />
              );
            })}
          </div>
          {METRIC_ORDER.filter(k => metrics[k]).length > 3 && (
            <button
              onClick={() => setShowAllMetrics(!showAllMetrics)}
              className="w-full mt-3 py-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              {showAllMetrics
                ? (lang === 'ja' ? '閉じる' : 'Show Less')
                : (lang === 'ja' ? `すべての指標を見る (${METRIC_ORDER.filter(k => metrics[k]).length})` : `View All Metrics (${METRIC_ORDER.filter(k => metrics[k]).length})`)
              }
            </button>
          )}
        </div>

        {/* Recommended Exercises */}
        {exercises.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tr.report.exercise}</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
              {exercises.map((exKey) => {
                const ex = tr.exercises[exKey as keyof typeof tr.exercises];
                if (!ex) return null;
                return (
                  <div key={exKey} className="flex min-w-[160px] flex-col gap-2 shrink-0">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Icon name="fitness_center" className="text-primary/40" size={48} />
                      <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Icon name="play_arrow" size={14} />
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{ex.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{ex.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-4">
          <button
            onClick={() => setPage('home')}
            className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {tr.report.backHome}
          </button>
          <button
            onClick={() => setPage('analysis')}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold transition-colors hover:bg-primary-dark"
          >
            {tr.report.newScan}
          </button>
        </div>
      </div>
    </div>
  );
}
