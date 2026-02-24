import type { MetricResult, MetricStatus, PostureMetrics } from '../db';
import type { RawFrame } from '../stores/analysisStore';

interface FrameMetric {
  values: number[];
}

function computeStability(values: number[]): number {
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - cv * 2)));
}

function statusToScore(status: MetricStatus): number {
  switch (status) {
    case 'good': return 100;
    case 'warning': return 60;
    case 'bad': return 20;
  }
}

function determineStatus(key: string, value: number): MetricStatus {
  switch (key) {
    case 'cva':
      return value > 53 ? 'good' : value > 48 ? 'warning' : 'bad';
    case 'headTilt':
      return Math.abs(value) < 5 ? 'good' : Math.abs(value) < 10 ? 'warning' : 'bad';
    case 'shoulderLevel':
      return value < 5 ? 'good' : value < 10 ? 'warning' : 'bad';
    case 'roundedShoulders':
      return value < 15 ? 'good' : value < 25 ? 'warning' : 'bad';
    case 'thoracicKyphosis':
      return value < 35 ? 'good' : value < 45 ? 'warning' : 'bad';
    case 'lumbarLordosis':
      return (value >= 25 && value <= 35) ? 'good' : (value >= 15 && value <= 45) ? 'warning' : 'bad';
    case 'pelvicTilt':
      return value < 3 ? 'good' : value < 5 ? 'warning' : 'bad';
    case 'trunkLean':
      return Math.abs(value) < 5 ? 'good' : Math.abs(value) < 10 ? 'warning' : 'bad';
    case 'kneeHyperextension':
      return value < 5 ? 'good' : value < 10 ? 'warning' : 'bad';
    default:
      return 'good';
  }
}

function buildMetricResult(key: string, fm: FrameMetric, unit: string): MetricResult {
  const values = fm.values;
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const stability = computeStability(values);
  const status = determineStatus(key, mean);
  return { value: Math.round(mean * 10) / 10, unit, status, stability, mean: Math.round(mean * 10) / 10, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

const FRONT_KEYS = ['cva', 'headTilt', 'shoulderLevel', 'roundedShoulders', 'pelvicTilt', 'trunkLean'] as const;
const SIDE_KEYS = ['thoracicKyphosis', 'lumbarLordosis', 'roundedShoulders', 'kneeHyperextension'] as const;

function collectFrameValues(frames: RawFrame[], keys: readonly string[]): Record<string, FrameMetric> {
  const result: Record<string, FrameMetric> = {};
  for (const k of keys) {
    result[k] = { values: [] };
  }
  for (const frame of frames) {
    for (const k of keys) {
      const v = frame.metrics[k];
      if (typeof v === 'number' && isFinite(v)) {
        result[k].values.push(v);
      }
    }
  }
  return result;
}

export function computeFrontMetrics(frames: RawFrame[]): PostureMetrics {
  const data = collectFrameValues(frames, FRONT_KEYS);
  return {
    cva: buildMetricResult('cva', data.cva, '°'),
    headTilt: buildMetricResult('headTilt', data.headTilt, '°'),
    shoulderLevel: buildMetricResult('shoulderLevel', data.shoulderLevel, '°'),
    roundedShoulders: buildMetricResult('roundedShoulders', data.roundedShoulders, '°'),
    pelvicTilt: buildMetricResult('pelvicTilt', data.pelvicTilt, '°'),
    trunkLean: buildMetricResult('trunkLean', data.trunkLean, '°'),
  };
}

export function computeFullMetrics(frontFrames: RawFrame[], sideFrames: RawFrame[]): PostureMetrics {
  const frontData = collectFrameValues(frontFrames, FRONT_KEYS);
  const sideData = collectFrameValues(sideFrames, SIDE_KEYS);

  return {
    cva: buildMetricResult('cva', frontData.cva, '°'),
    headTilt: buildMetricResult('headTilt', frontData.headTilt, '°'),
    shoulderLevel: buildMetricResult('shoulderLevel', frontData.shoulderLevel, '°'),
    roundedShoulders: sideData.roundedShoulders.values.length > 0
      ? buildMetricResult('roundedShoulders', sideData.roundedShoulders, '°')
      : buildMetricResult('roundedShoulders', frontData.roundedShoulders, '°'),
    thoracicKyphosis: buildMetricResult('thoracicKyphosis', sideData.thoracicKyphosis, '°'),
    lumbarLordosis: buildMetricResult('lumbarLordosis', sideData.lumbarLordosis, '°'),
    pelvicTilt: buildMetricResult('pelvicTilt', frontData.pelvicTilt, '°'),
    trunkLean: buildMetricResult('trunkLean', frontData.trunkLean, '°'),
    kneeHyperextension: buildMetricResult('kneeHyperextension', sideData.kneeHyperextension, '°'),
  };
}

export function computeOverallScore(metrics: PostureMetrics): number {
  const entries = Object.values(metrics).filter((m): m is MetricResult => !!m);
  if (entries.length === 0) return 0;

  const weights: Record<string, number> = {
    cva: 1.5,
    headTilt: 1,
    shoulderLevel: 1,
    roundedShoulders: 1.2,
    thoracicKyphosis: 1.3,
    lumbarLordosis: 1.2,
    pelvicTilt: 1,
    trunkLean: 1,
    kneeHyperextension: 0.8,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  const keys = Object.keys(metrics) as (keyof PostureMetrics)[];
  for (const key of keys) {
    const m = metrics[key];
    if (!m) continue;
    const w = weights[key] ?? 1;
    const baseScore = statusToScore(m.status);
    const stabilityBonus = (m.stability - 50) / 50 * 5; // ±5 bonus
    weightedSum += (baseScore + stabilityBonus) * w;
    totalWeight += w;
  }

  return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
}
