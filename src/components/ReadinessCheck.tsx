import { useAppStore } from '../stores/appStore';
import { t } from '../i18n';
import type { ReadinessCheck as RCheck } from '../analysis/metrics';

interface Props {
  checks: RCheck[];
  results: boolean[];
  allPassed: boolean;
}

export function ReadinessOverlay({ checks, results, allPassed }: Props) {
  const lang = useAppStore((s) => s.lang);
  const tr = t(lang);

  if (allPassed) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
        <div className="text-6xl font-bold text-green-400 animate-pulse">OK!</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 px-6">
      <h3 className="text-xl font-bold text-white mb-4">{tr.analysis.readinessTitle}</h3>
      <div className="space-y-2 mb-4">
        {checks.map((check, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${results[i] ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
            <span className={`text-lg ${results[i] ? 'text-green-400' : 'text-gray-400'}`}>
              {results[i] ? '✓' : '○'}
            </span>
            <span className="text-white text-sm">
              {tr.readiness[check.labelKey as keyof typeof tr.readiness]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-300">{tr.analysis.readinessHint}</p>
    </div>
  );
}
