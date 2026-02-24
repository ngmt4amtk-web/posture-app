import type { PostureMetrics, MetricStatus } from '../db';

export type MetricKey = keyof PostureMetrics;

// Map metric status → exercise recommendations
export interface ExerciseRec {
  exerciseKey: string;
  forMetrics: MetricKey[];
}

const EXERCISE_MAP: ExerciseRec[] = [
  { exerciseKey: 'chinTuck', forMetrics: ['cva'] },
  { exerciseKey: 'chestStretch', forMetrics: ['roundedShoulders', 'thoracicKyphosis'] },
  { exerciseKey: 'shoulderBlade', forMetrics: ['roundedShoulders', 'shoulderLevel'] },
  { exerciseKey: 'catCow', forMetrics: ['thoracicKyphosis', 'lumbarLordosis'] },
  { exerciseKey: 'plank', forMetrics: ['trunkLean', 'pelvicTilt'] },
  { exerciseKey: 'hipStretch', forMetrics: ['pelvicTilt', 'lumbarLordosis'] },
  { exerciseKey: 'wallAngel', forMetrics: ['thoracicKyphosis', 'roundedShoulders'] },
];

export function getRecommendedExercises(metrics: PostureMetrics): string[] {
  const badMetrics = new Set<MetricKey>();

  for (const [key, m] of Object.entries(metrics)) {
    if (m && (m.status === 'warning' || m.status === 'bad')) {
      badMetrics.add(key as MetricKey);
    }
  }

  if (badMetrics.size === 0) return [];

  const exercises: string[] = [];
  for (const rec of EXERCISE_MAP) {
    if (rec.forMetrics.some((k) => badMetrics.has(k))) {
      exercises.push(rec.exerciseKey);
    }
  }
  return [...new Set(exercises)];
}

export function getMetricAdviceKey(status: MetricStatus): 'good' | 'warning' | 'bad' {
  return status;
}
