import type { PostureMetrics, MetricResult } from '../db';

export type PostureTypeName =
  | 'ideal'
  | 'phoneNeck'
  | 'roundedBack'
  | 'swayBack'
  | 'leanType'
  | 'combined'
  | 'modern';

export interface PostureType {
  type: PostureTypeName;
  emoji: string;
  priority: number; // lower = more relevant
}

function isBad(m?: MetricResult): boolean {
  return m?.status === 'bad';
}
function isWarningOrBad(m?: MetricResult): boolean {
  return m?.status === 'warning' || m?.status === 'bad';
}

export function diagnosePostureType(metrics: PostureMetrics, score: number): PostureTypeName {
  const badCount = Object.values(metrics).filter((m) => m && isBad(m)).length;
  const warnCount = Object.values(metrics).filter((m) => m && isWarningOrBad(m)).length;

  // Ideal posture
  if (score >= 90 && badCount === 0) return 'ideal';

  // Specific patterns
  const hasPhoneNeck = isBad(metrics.cva) || (isWarningOrBad(metrics.cva) && isWarningOrBad(metrics.headTilt));
  const hasRoundedBack = isWarningOrBad(metrics.roundedShoulders) && isWarningOrBad(metrics.thoracicKyphosis);
  const hasSwayBack = isWarningOrBad(metrics.lumbarLordosis) && isWarningOrBad(metrics.pelvicTilt);
  const hasLean = isWarningOrBad(metrics.trunkLean) && isWarningOrBad(metrics.shoulderLevel);

  // Combined — multiple distinct issues
  const patternCount = [hasPhoneNeck, hasRoundedBack, hasSwayBack, hasLean].filter(Boolean).length;
  if (patternCount >= 2 || badCount >= 3) return 'combined';

  // Single dominant pattern
  if (hasPhoneNeck) return 'phoneNeck';
  if (hasRoundedBack) return 'roundedBack';
  if (hasSwayBack) return 'swayBack';
  if (hasLean) return 'leanType';

  // General modern posture (some warnings but no dominant pattern)
  if (warnCount >= 2) return 'modern';

  return 'ideal';
}

export function getScoreTier(score: number): 'excellent' | 'good' | 'average' | 'needsWork' | 'rescue' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'needsWork';
  return 'rescue';
}

export function getStabilityGrade(metrics: PostureMetrics): { avg: number; grade: 'A' | 'B' | 'C' | 'D' } {
  const stabilities = Object.values(metrics)
    .filter((m): m is MetricResult => !!m)
    .map((m) => m.stability);
  if (stabilities.length === 0) return { avg: 0, grade: 'D' };
  const avg = Math.round(stabilities.reduce((a, b) => a + b, 0) / stabilities.length);
  const grade = avg >= 85 ? 'A' : avg >= 70 ? 'B' : avg >= 50 ? 'C' : 'D';
  return { avg, grade };
}
