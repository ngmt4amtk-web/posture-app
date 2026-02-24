import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

let poseLandmarker: PoseLandmarker | null = null;
let drawingUtils: DrawingUtils | null = null;

export type InitCallback = (status: 'loading' | 'loading-cpu' | 'ready' | 'error', msg?: string) => void;

export async function initMediaPipe(onStatus: InitCallback): Promise<PoseLandmarker> {
  if (poseLandmarker) {
    onStatus('ready');
    return poseLandmarker;
  }

  try {
    onStatus('loading');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.15,
      minPosePresenceConfidence: 0.15,
      minTrackingConfidence: 0.15,
      outputSegmentationMasks: false,
    });
    onStatus('ready');
    return poseLandmarker;
  } catch {
    // Fallback to CPU + lite model
    try {
      onStatus('loading-cpu');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      onStatus('ready');
      return poseLandmarker;
    } catch (e2) {
      onStatus('error', (e2 as Error).message);
      throw e2;
    }
  }
}

export function detectPose(video: HTMLVideoElement, timestamp: number) {
  if (!poseLandmarker || video.readyState < 2) return null;
  return poseLandmarker.detectForVideo(video, timestamp);
}

export function getDrawingUtils(ctx: CanvasRenderingContext2D): DrawingUtils {
  if (!drawingUtils) {
    drawingUtils = new DrawingUtils(ctx);
  }
  return drawingUtils;
}

export { PoseLandmarker };
