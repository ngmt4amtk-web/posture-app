import { PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Landmark } from './metrics';
import type { MetricStatus } from '../db';

const STATUS_COLORS: Record<MetricStatus, string> = {
  good: 'rgba(34, 197, 94, 0.8)',
  warning: 'rgba(245, 158, 11, 0.8)',
  bad: 'rgba(239, 68, 68, 0.8)',
};

// Determine region status color from landmark indices
function getRegionColor(startIdx: number, endIdx: number, statuses: Record<string, MetricStatus>): string {
  const headIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const torsoIndices = new Set([11, 12, 23, 24]);

  if (headIndices.has(startIdx) && headIndices.has(endIdx)) {
    const worst = worstStatus(statuses.cva, statuses.headTilt);
    return STATUS_COLORS[worst];
  }
  if (torsoIndices.has(startIdx) && torsoIndices.has(endIdx)) {
    const worst = worstStatus(statuses.trunkLean, statuses.shoulderLevel);
    return STATUS_COLORS[worst];
  }
  return 'rgba(100, 200, 255, 0.6)';
}

function worstStatus(...statuses: (MetricStatus | undefined)[]): MetricStatus {
  if (statuses.includes('bad')) return 'bad';
  if (statuses.includes('warning')) return 'warning';
  return 'good';
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  statuses: Record<string, MetricStatus>
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  if (!landmarks || landmarks.length === 0) { ctx.restore(); return; }

  const connections = PoseLandmarker.POSE_CONNECTIONS;

  // Draw connections
  for (const conn of connections) {
    const s = conn.start, e = conn.end;
    const sl = landmarks[s], el = landmarks[e];
    if ((sl.visibility ?? 0) < 0.3 || (el.visibility ?? 0) < 0.3) continue;

    const color = getRegionColor(s, e, statuses);
    ctx.beginPath();
    ctx.moveTo(sl.x * w, sl.y * h);
    ctx.lineTo(el.x * w, el.y * h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw landmarks
  for (let i = 0; i < landmarks.length; i++) {
    if ((landmarks[i].visibility ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(landmarks[i].x * w, landmarks[i].y * h, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // CVA angle annotation
  drawCVALine(ctx, landmarks, w, h, statuses.cva);

  ctx.restore();
}

function drawCVALine(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  w: number,
  h: number,
  cvaStatus?: MetricStatus
) {
  const ear = (lm[7].visibility ?? 0) >= (lm[8].visibility ?? 0) ? lm[7] : lm[8];
  const shoulder = (lm[7].visibility ?? 0) >= (lm[8].visibility ?? 0) ? lm[11] : lm[12];
  if ((ear.visibility ?? 0) < 0.3 || (shoulder.visibility ?? 0) < 0.3) return;

  const ex = ear.x * w, ey = ear.y * h;
  const sx = shoulder.x * w, sy = shoulder.y * h;
  const cva = Math.round(Math.atan2(sy - ey, Math.abs(ex - sx)) * 180 / Math.PI);

  ctx.save();
  ctx.setLineDash([4, 4]);
  const color = cvaStatus ? STATUS_COLORS[cvaStatus] : 'rgba(180, 136, 255, 0.7)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx - 30, sy); ctx.lineTo(sx + 30, sy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 2;
  const label = `CVA ${cva}°`;
  const mx = (ex + sx) / 2 + 6, my = (ey + sy) / 2;
  ctx.strokeText(label, mx, my);
  ctx.fillText(label, mx, my);
  ctx.restore();
}
