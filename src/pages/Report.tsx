import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useHistoryStore } from '../stores/historyStore';
import { t } from '../i18n';
import { ScoreRing } from '../components/ScoreRing';
import { MetricCard } from '../components/MetricCard';
import { getRecommendedExercises, getMetricAdviceKey } from '../analysis/advice';
import { diagnosePostureType, getScoreTier, getStabilityGrade } from '../analysis/postureType';
import type { PostureMetrics } from '../db';

type MetricKey = keyof PostureMetrics;

const METRIC_ORDER: MetricKey[] = [
  'cva', 'headTilt', 'shoulderLevel', 'roundedShoulders',
  'thoracicKyphosis', 'lumbarLordosis', 'pelvicTilt', 'trunkLean', 'kneeHyperextension',
];

const TIER_COLORS = {
  excellent: 'from-yellow-400 to-amber-500',
  good: 'from-green-400 to-emerald-500',
  average: 'from-blue-400 to-indigo-500',
  needsWork: 'from-orange-400 to-amber-600',
  rescue: 'from-red-400 to-rose-600',
};

const TIER_BG = {
  excellent: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
  good: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
  average: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
  needsWork: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
  rescue: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
};

const STABILITY_COLORS = {
  A: 'text-green-500',
  B: 'text-blue-500',
  C: 'text-amber-500',
  D: 'text-red-500',
};

export function Report() {
  const { lang, setPage } = useAppStore();
  const session = useHistoryStore((s) => s.selectedSession);
  const tr = t(lang);
  const [showDetail, setShowDetail] = useState(false);

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">{tr.home.noData}</p>
        <button onClick={() => setPage('home')} className="mt-4 text-primary-500">{tr.report.backHome}</button>
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

  // Count statuses for summary bar
  const statusCounts = { good: 0, warning: 0, bad: 0 };
  for (const key of METRIC_ORDER) {
    const m = metrics[key];
    if (m) statusCounts[m.status]++;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
      {/* === LAYER 1: Casual / Fun Report === */}

      {/* Posture Type Card — the star of the show */}
      <div className={`rounded-2xl border p-6 ${TIER_BG[tier]} relative overflow-hidden`}>
        <div className="text-center">
          <span className="text-5xl">{typeTr.emoji}</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1">{tr.postureType.yourType}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{typeTr.name}</h1>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-1">{typeTr.tagline}</p>
        </div>
      </div>

      {/* Score + Tier */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <ScoreRing score={overallScore} size={130} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r ${TIER_COLORS[tier]}`}>
                {tierTr.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{tierTr.comment}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(session.timestamp).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{typeTr.desc}</p>
      </div>

      {/* Stability Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{tr.report.stabilityTitle}</h2>
          <span className={`text-2xl font-bold ${STABILITY_COLORS[stability.grade]}`}>{stability.grade}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{tr.report.stabilityDesc}</p>
        {/* Stability bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${stability.avg >= 70 ? 'bg-green-500' : stability.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${stability.avg}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{stability.avg}%</p>
      </div>

      {/* Status Summary Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex gap-3">
          {statusCounts.good > 0 && (
            <div className="flex-1 text-center py-2 rounded-xl bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.good}</div>
              <div className="text-xs text-green-600 dark:text-green-400">{tr.report.good}</div>
            </div>
          )}
          {statusCounts.warning > 0 && (
            <div className="flex-1 text-center py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{statusCounts.warning}</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">{tr.report.warning}</div>
            </div>
          )}
          {statusCounts.bad > 0 && (
            <div className="flex-1 text-center py-2 rounded-xl bg-red-50 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.bad}</div>
              <div className="text-xs text-red-600 dark:text-red-400">{tr.report.bad}</div>
            </div>
          )}
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

      {/* === LAYER 2 Toggle === */}
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium text-sm hover:border-primary-400 hover:text-primary-500 transition-colors"
      >
        {showDetail ? tr.report.hideDetail : tr.report.showDetail}
      </button>

      {/* === LAYER 2: Detailed Numerical Data === */}
      {showDetail && (
        <div className="space-y-3 animate-fadeIn">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tr.report.metrics}</h2>
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
