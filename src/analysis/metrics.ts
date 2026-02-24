import type { MetricStatus } from '../db';

// Math utilities
function rad2deg(r: number) { return r * 180 / Math.PI; }

function angleBetween3(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const ba = { x: ax - bx, y: ay - by };
  const bc = { x: cx - bx, y: cy - by };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  return rad2deg(Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))));
}

// EMA smoothing
function ema(prev: number | null, curr: number, alpha: number): number {
  if (prev === null) return curr;
  return prev + alpha * (curr - prev);
}

// Landmark interface
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Raw metric values before aggregation
export interface RawMetrics {
  cva: number;
  cvaStatus: MetricStatus;
  headTilt: number;
  headTiltStatus: MetricStatus;
  shoulderLevel: number;
  shoulderLevelStatus: MetricStatus;
  roundedShoulders: number;
  roundedShouldersStatus: MetricStatus;
  thoracicKyphosis: number;
  thoracicKyphosisStatus: MetricStatus;
  lumbarLordosis: number;
  lumbarLordosisStatus: MetricStatus;
  pelvicTilt: number;
  pelvicTiltStatus: MetricStatus;
  trunkLean: number;
  trunkLeanStatus: MetricStatus;
  kneeHyperextension: number;
  kneeHyperextensionStatus: MetricStatus;
}

// Analyze front-view posture
export function analyzeFront(landmarks: Landmark[], w: number, h: number): Partial<RawMetrics> {
  const px = (lm: Landmark) => lm.x * w;
  const py = (lm: Landmark) => lm.y * h;

  const nose = landmarks[0];
  const lEar = landmarks[7], rEar = landmarks[8];
  const lShoulder = landmarks[11], rShoulder = landmarks[12];
  const lHip = landmarks[23], rHip = landmarks[24];

  const result: Partial<RawMetrics> = {};

  // CVA (Craniovertebral Angle)
  const useLeftEar = (lEar.visibility ?? 0) >= (rEar.visibility ?? 0);
  const ear = useLeftEar ? lEar : rEar;
  const shoulder = useLeftEar ? lShoulder : rShoulder;
  result.cva = rad2deg(Math.atan2(py(shoulder) - py(ear), Math.abs(px(ear) - px(shoulder))));
  result.cvaStatus = result.cva > 53 ? 'good' : result.cva > 48 ? 'warning' : 'bad';

  // Head Tilt
  const earDy = py(lEar) - py(rEar);
  const earDx = px(rEar) - px(lEar);
  result.headTilt = rad2deg(Math.atan2(earDy, earDx));
  result.headTiltStatus = Math.abs(result.headTilt) < 5 ? 'good' : Math.abs(result.headTilt) < 10 ? 'warning' : 'bad';

  // Shoulder Level (symmetry)
  const shoulderDist = Math.abs(px(rShoulder) - px(lShoulder));
  result.shoulderLevel = shoulderDist > 0
    ? rad2deg(Math.atan2(Math.abs(py(lShoulder) - py(rShoulder)), shoulderDist))
    : 0;
  result.shoulderLevelStatus = result.shoulderLevel < 5 ? 'good' : result.shoulderLevel < 10 ? 'warning' : 'bad';

  // Rounded Shoulders — estimated from front view via shoulder-ear-nose geometry
  // This is a rough proxy; better from side view
  const midShoulderX = (px(lShoulder) + px(rShoulder)) / 2;
  const noseX = px(nose);
  const shoulderWidth = Math.abs(px(rShoulder) - px(lShoulder));
  const forwardShift = shoulderWidth > 0 ? Math.abs(noseX - midShoulderX) / shoulderWidth * 30 : 0;
  result.roundedShoulders = forwardShift;
  result.roundedShouldersStatus = forwardShift < 15 ? 'good' : forwardShift < 25 ? 'warning' : 'bad';

  // Pelvic Tilt (left-right hip difference)
  const hipDist = Math.abs(px(rHip) - px(lHip));
  result.pelvicTilt = hipDist > 0
    ? rad2deg(Math.atan2(Math.abs(py(lHip) - py(rHip)), hipDist))
    : 0;
  result.pelvicTiltStatus = result.pelvicTilt < 3 ? 'good' : result.pelvicTilt < 5 ? 'warning' : 'bad';

  // Trunk Lean
  const midHipX = (px(lHip) + px(rHip)) / 2;
  const midHipY = (py(lHip) + py(rHip)) / 2;
  const midShoulderY = (py(lShoulder) + py(rShoulder)) / 2;
  result.trunkLean = rad2deg(Math.atan2(midShoulderX - midHipX, midHipY - midShoulderY));
  result.trunkLeanStatus = Math.abs(result.trunkLean) < 5 ? 'good' : Math.abs(result.trunkLean) < 10 ? 'warning' : 'bad';

  return result;
}

// Analyze side-view posture
export function analyzeSide(landmarks: Landmark[], w: number, h: number): Partial<RawMetrics> {
  const px = (lm: Landmark) => lm.x * w;
  const py = (lm: Landmark) => lm.y * h;

  const ear = landmarks[7].visibility! > (landmarks[8].visibility ?? 0) ? landmarks[7] : landmarks[8];
  const shoulder = landmarks[7].visibility! > (landmarks[8].visibility ?? 0) ? landmarks[11] : landmarks[12];
  const hip = landmarks[7].visibility! > (landmarks[8].visibility ?? 0) ? landmarks[23] : landmarks[24];
  const knee = landmarks[7].visibility! > (landmarks[8].visibility ?? 0) ? landmarks[25] : landmarks[26];
  const ankle = landmarks[7].visibility! > (landmarks[8].visibility ?? 0) ? landmarks[27] : landmarks[28];

  const result: Partial<RawMetrics> = {};

  // Thoracic Kyphosis — shoulder-ear angle relative to vertical
  const thoracicAngle = rad2deg(Math.atan2(px(ear) - px(shoulder), py(shoulder) - py(ear)));
  result.thoracicKyphosis = Math.abs(thoracicAngle);
  result.thoracicKyphosisStatus = result.thoracicKyphosis < 35 ? 'good' : result.thoracicKyphosis < 45 ? 'warning' : 'bad';

  // Lumbar Lordosis — hip-shoulder-ear alignment
  const lumbarAngle = angleBetween3(px(ear), py(ear), px(shoulder), py(shoulder), px(hip), py(hip));
  result.lumbarLordosis = Math.abs(180 - lumbarAngle);
  result.lumbarLordosisStatus = (result.lumbarLordosis >= 25 && result.lumbarLordosis <= 35) ? 'good'
    : (result.lumbarLordosis >= 15 && result.lumbarLordosis <= 45) ? 'warning' : 'bad';

  // Rounded Shoulders (side view — more accurate)
  const shoulderForward = rad2deg(Math.atan2(px(shoulder) - px(hip), py(hip) - py(shoulder)));
  result.roundedShoulders = Math.abs(shoulderForward);
  result.roundedShouldersStatus = result.roundedShoulders < 15 ? 'good' : result.roundedShoulders < 25 ? 'warning' : 'bad';

  // Knee Hyperextension
  const kneeAngle = angleBetween3(px(hip), py(hip), px(knee), py(knee), px(ankle), py(ankle));
  const hyperext = Math.max(0, kneeAngle - 180);
  result.kneeHyperextension = hyperext;
  result.kneeHyperextensionStatus = hyperext < 5 ? 'good' : hyperext < 10 ? 'warning' : 'bad';

  return result;
}

// Smoothing state
let smoothed: Record<string, number> | null = null;
const ALPHA = 0.3;

const numericKeys = [
  'cva', 'headTilt', 'shoulderLevel', 'roundedShoulders',
  'thoracicKyphosis', 'lumbarLordosis', 'pelvicTilt', 'trunkLean', 'kneeHyperextension',
];

export function smoothMetrics(raw: Partial<RawMetrics>): Partial<RawMetrics> {
  if (!smoothed) smoothed = {};
  for (const k of numericKeys) {
    const v = raw[k as keyof RawMetrics];
    if (typeof v === 'number') {
      smoothed[k] = ema(smoothed[k] ?? null, v, ALPHA);
      (raw as Record<string, unknown>)[k] = smoothed[k];
    }
  }
  return raw;
}

export function resetSmoothing() {
  smoothed = null;
}

// Readiness check definitions
export interface ReadinessCheck {
  labelKey: string;
  landmarks: number[];
  threshold: number;
  anyOf?: boolean;
}

export const READINESS_FRONT: ReadinessCheck[] = [
  { labelKey: 'face', landmarks: [0], threshold: 0.1 },
  { labelKey: 'ears', landmarks: [7, 8], threshold: 0.1, anyOf: true },
  { labelKey: 'shoulders', landmarks: [11, 12], threshold: 0.1, anyOf: true },
  { labelKey: 'hips', landmarks: [23, 24], threshold: 0.1, anyOf: true },
];

export const READINESS_SIDE: ReadinessCheck[] = [
  { labelKey: 'ears', landmarks: [7, 8], threshold: 0.1, anyOf: true },
  { labelKey: 'shoulders', landmarks: [11, 12], threshold: 0.1, anyOf: true },
  { labelKey: 'hips', landmarks: [23, 24], threshold: 0.1, anyOf: true },
  { labelKey: 'knees', landmarks: [25, 26], threshold: 0.1, anyOf: true },
];

export function checkLandmarkVisible(landmarks: Landmark[], idx: number, threshold: number): boolean {
  const lm = landmarks[idx];
  if (!lm) return false;
  if (typeof lm.visibility === 'number' && lm.visibility > 0.01) {
    return lm.visibility >= threshold;
  }
  return lm.x > 0.02 && lm.x < 0.98 && lm.y > 0.02 && lm.y < 0.98;
}

export function checkReadiness(landmarks: Landmark[], checks: ReadinessCheck[]): boolean[] {
  return checks.map((check) => {
    if (check.anyOf) {
      return check.landmarks.some((idx) => checkLandmarkVisible(landmarks, idx, check.threshold));
    }
    return check.landmarks.every((idx) => checkLandmarkVisible(landmarks, idx, check.threshold));
  });
}
