interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ScoreRing({ score, size = 160, strokeWidth = 12, label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? 'var(--color-good)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-bad)';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-animated"
          style={{ '--circumference': circumference, '--offset': offset } as React.CSSProperties}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-4xl font-bold dark:text-white" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
      </div>
      {label && <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  );
}
