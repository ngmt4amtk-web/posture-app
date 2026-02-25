import { useState } from 'react';
import type { MetricResult } from '../db';
import { Icon } from './Icon';

interface Props {
  name: string;
  category: string;
  metric: MetricResult;
  adviceText?: string;
  icon?: string;
}

const STATUS_CONFIG = {
  good: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    icon: 'sentiment_satisfied',
    label: 'Good',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    icon: 'sentiment_neutral',
    label: 'Warning',
  },
  bad: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    icon: 'sentiment_dissatisfied',
    label: 'Needs Work',
  },
} as const;

function scoreToPercent(status: 'good' | 'warning' | 'bad', stability: number): number {
  const base = status === 'good' ? 85 : status === 'warning' ? 55 : 30;
  return Math.min(100, base + (stability - 50) / 50 * 15);
}

export function MetricCard({ name, category, metric, adviceText, icon }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[metric.status];
  const pct = scoreToPercent(metric.status, metric.stability);

  return (
    <div
      className="group flex flex-col gap-3 rounded-xl bg-white dark:bg-surface-dark-2 p-4 border border-slate-100 dark:border-slate-800/50 hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
            <Icon name={icon || cfg.icon} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">{category}</p>
            <h4 className="text-slate-900 dark:text-white font-bold text-base">{name}</h4>
          </div>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
          {cfg.label} ({metric.value}{metric.unit})
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-1.5 rounded-full ${cfg.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-1">
        {adviceText && !expanded ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mr-2">{adviceText}</p>
        ) : (
          <div />
        )}
        <button className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-primary flex items-center transition-colors shrink-0">
          Details <Icon name="chevron_right" size={16} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="animate-fadeIn border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
          {adviceText && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{adviceText}</p>
          )}
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-500">
            <span>Avg: {metric.mean}{metric.unit}</span>
            <span>Range: {metric.min}–{metric.max}{metric.unit}</span>
            <span>Stability: {metric.stability}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
