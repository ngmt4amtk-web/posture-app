import { useEffect, useRef } from 'react';
import type { Landmark } from '../analysis/metrics';
import { drawSkeleton } from '../analysis/renderer';
import type { MetricStatus } from '../db';
import { useAnalysisStore } from '../stores/analysisStore';

interface Props {
  landmarks: Landmark[] | null;
  videoWidth: number;
  videoHeight: number;
  statuses: Record<string, MetricStatus>;
}

export function PoseOverlay({ landmarks, videoWidth, videoHeight, statuses }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const facingMode = useAnalysisStore((s) => s.facingMode);
  const isMirrored = facingMode === 'user';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx || !landmarks) {
      ctx?.clearRect(0, 0, videoWidth, videoHeight);
      return;
    }
    drawSkeleton(ctx, landmarks, videoWidth, videoHeight, statuses);
  }, [landmarks, videoWidth, videoHeight, statuses]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${isMirrored ? 'mirror' : ''}`}
    />
  );
}
