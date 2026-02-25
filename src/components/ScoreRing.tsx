interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function ScoreRing({ score, size = 192, strokeWidth = 8, label }: Props) {
  const radius = (size - strokeWidth * 2) / 2 * 0.9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex flex-col items-center">
      {/* Outer glow */}
      <div
        className="absolute rounded-full bg-primary/20 blur-2xl"
        style={{ width: size, height: size }}
      />
      <svg width={size} height={size} className="transform -rotate-90 relative">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Progress circle */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="url(#scoreGradient)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring-animated"
          style={{ '--circumference': circumference, '--offset': offset } as React.CSSProperties}
        />
      </svg>
      {/* Inner text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-primary dark:text-primary-light">{score}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label || 'Posture Score'}
        </span>
      </div>
    </div>
  );
}
