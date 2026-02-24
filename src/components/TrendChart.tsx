import type { Session } from '../db';

interface Props {
  sessions: Session[];
  width?: number;
  height?: number;
}

export function TrendChart({ sessions, width = 320, height = 160 }: Props) {
  if (sessions.length === 0) return null;

  const sorted = [...sessions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const scores = sorted.map((s) => s.overallScore);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const padX = 40;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = scores.map((s, i) => {
    const x = padX + (scores.length > 1 ? (i / (scores.length - 1)) * chartW : chartW / 2);
    const y = padY + chartH - ((s - minScore) / range) * chartH;
    return { x, y, score: s };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const getColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].filter(v => v >= minScore && v <= maxScore).map((v) => {
        const y = padY + chartH - ((v - minScore) / range) * chartH;
        return (
          <g key={v}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" strokeOpacity={0.1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity={0.4} fontSize={10}>{v}</text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill={getColor(p.score)} stroke="white" strokeWidth={2} />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fill="currentColor" fillOpacity={0.6} fontSize={10}>{p.score}</text>
        </g>
      ))}

      {/* Date labels */}
      {sorted.length <= 7 && sorted.map((s, i) => {
        const d = new Date(s.timestamp);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return (
          <text key={i} x={points[i].x} y={height - 4} textAnchor="middle" fill="currentColor" fillOpacity={0.4} fontSize={9}>{label}</text>
        );
      })}
    </svg>
  );
}
