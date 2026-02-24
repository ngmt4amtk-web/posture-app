import type { MetricResult } from '../db';

interface Props {
  name: string;
  desc: string;
  ref_text: string;
  metric: MetricResult;
  adviceText?: string;
}

const STATUS_BG = {
  good: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  bad: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
} as const;

const STATUS_DOT = {
  good: 'bg-green-500',
  warning: 'bg-amber-500',
  bad: 'bg-red-500',
} as const;

export function MetricCard({ name, desc, ref_text, metric, adviceText }: Props) {
  return (
    <div className={`rounded-xl border p-4 ${STATUS_BG[metric.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${STATUS_DOT[metric.status]}`} />
          <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
        </div>
        <span className="text-xl font-bold dark:text-white">
          {metric.value}{metric.unit}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{desc}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">{ref_text}</p>

      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-500">
        <span>avg: {metric.mean}{metric.unit}</span>
        <span>range: {metric.min}–{metric.max}{metric.unit}</span>
        <span>stability: {metric.stability}%</span>
      </div>

      {adviceText && (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-2">
          {adviceText}
        </p>
      )}
    </div>
  );
}
