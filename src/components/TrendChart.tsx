import type { Session } from '../db';

interface Props {
  sessions: Session[];
  height?: number;
}

export function TrendChart({ sessions, height = 140 }: Props) {
  if (sessions.length === 0) return null;

  const maxScore = 100;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Map sessions to last 7 days
  const dayScores: (number | null)[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const match = [...sessions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .find(s => new Date(s.timestamp).toDateString() === dayStr);
    dayScores.push(match ? match.overallScore : null);
  }

  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayLabels.push(days[d.getDay()]);
  }

  // Compute trend
  const validScores = dayScores.filter((s): s is number => s !== null);
  const trend = validScores.length >= 2
    ? validScores[validScores.length - 1] - validScores[0]
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">7-Day Trend</h3>
        {trend !== 0 && (
          <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
            trend > 0
              ? 'text-green-500 bg-green-500/10'
              : 'text-red-500 bg-red-500/10'
          }`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {trend > 0 ? 'trending_up' : 'trending_down'}
            </span>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="w-full bg-white dark:bg-surface-dark rounded-xl p-4 border border-slate-200 dark:border-slate-800">
        <div style={{ height }} className="w-full relative flex items-end justify-between px-1 gap-2">
          {dayScores.map((score, i) => {
            const pct = score ? (score / maxScore) * 100 : 0;
            const isToday = i === dayScores.length - 1;
            const isLatest = isToday && score !== null;
            return (
              <div key={i} className="w-full relative group flex flex-col items-center">
                {score !== null && (
                  <div className={`absolute -top-6 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap ${
                    isLatest ? 'opacity-100 font-bold' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {score}
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isLatest
                      ? 'bg-primary'
                      : score !== null
                        ? i === dayScores.length - 2
                          ? 'bg-primary/40'
                          : 'bg-slate-200 dark:bg-slate-800'
                        : 'bg-slate-100 dark:bg-slate-800/50'
                  }`}
                  style={{ height: `${Math.max(pct, score !== null ? 8 : 4)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
          {dayLabels.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
