import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useAnalysisStore } from '../stores/analysisStore';
import { useHistoryStore } from '../stores/historyStore';
import { useProfileStore } from '../stores/profileStore';
import { t } from '../i18n';
import { Camera } from '../components/Camera';
import { PoseOverlay } from '../components/PoseOverlay';
import { ReadinessOverlay } from '../components/ReadinessCheck';
import { initMediaPipe, detectPose } from '../analysis/mediapipe';
import {
  analyzeFront, analyzeSide, smoothMetrics, resetSmoothing,
  READINESS_FRONT, READINESS_SIDE, checkReadiness as checkReady,
  type Landmark,
} from '../analysis/metrics';
import { computeFrontMetrics, computeFullMetrics, computeOverallScore } from '../analysis/scoring';
import type { MetricStatus, Session } from '../db';

const MEASURE_DURATION = 15;
const READINESS_FRAMES_NEEDED = 3;

export function Analysis() {
  const { lang, setPage } = useAppStore();
  const store = useAnalysisStore();
  const addSession = useHistoryStore((s) => s.addSession);
  const selectSession = useHistoryStore((s) => s.selectSession);
  const profile = useProfileStore((s) => s.profile);
  const tr = t(lang);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [loadStatus, setLoadStatus] = useState<string>('');
  const [modelReady, setModelReady] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 640, h: 480 });
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, MetricStatus>>({});
  const [readinessResults, setReadinessResults] = useState<boolean[]>([]);
  const [, setReadinessPassCount] = useState(0);
  const [allPassed, setAllPassed] = useState(false);

  const phaseRef = useRef(store.phase);
  phaseRef.current = store.phase;
  const framesRef = useRef(store.frames);
  framesRef.current = store.frames;
  const sideFramesRef = useRef(store.sideFrames);
  sideFramesRef.current = store.sideFrames;
  const measureStartRef = useRef<number>(0);
  const readinessPassRef = useRef(0);

  // Init MediaPipe
  useEffect(() => {
    store.reset();
    store.setPhase('loading');
    resetSmoothing();
    initMediaPipe((status, msg) => {
      if (status === 'loading') setLoadStatus(tr.analysis.loading);
      else if (status === 'loading-cpu') setLoadStatus(tr.analysis.loadingCpu);
      else if (status === 'ready') {
        setLoadStatus(tr.analysis.ready);
        setModelReady(true);
        store.setPhase('ready');
      }
      else if (status === 'error') setLoadStatus(`Error: ${msg}`);
    });
    return () => {
      cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    setVideoSize({ w: video.videoWidth, h: video.videoHeight });
    if (modelReady) startDetectionLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelReady]);

  const startDetectionLoop = useCallback(() => {
    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const ct = video.currentTime;
      if (ct === lastTimeRef.current) return;
      lastTimeRef.current = ct;

      const result = detectPose(video, performance.now());
      if (!result?.landmarks?.[0]) {
        setLandmarks(null);
        if (phaseRef.current === 'readiness' || phaseRef.current === 'side-readiness') {
          readinessPassRef.current = 0;
          setReadinessPassCount(0);
        }
        return;
      }

      const lm = result.landmarks[0] as Landmark[];
      setLandmarks(lm);

      const phase = phaseRef.current;
      const w = videoRef.current!.videoWidth;
      const h = videoRef.current!.videoHeight;

      // Front analysis
      if (phase === 'readiness' || phase === 'countdown' || phase === 'measuring' ||
          phase === 'ready' || phase === 'done') {
        const raw = smoothMetrics(analyzeFront(lm, w, h));
        const st: Record<string, MetricStatus> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (k.endsWith('Status') && typeof v === 'string') st[k.replace('Status', '')] = v as MetricStatus;
        }
        setStatuses(st);

        if (phase === 'measuring') {
          const frame = { time: performance.now() - measureStartRef.current, metrics: {} as Record<string, number> };
          for (const [k, v] of Object.entries(raw)) {
            if (typeof v === 'number') frame.metrics[k] = v;
          }
          store.addFrame(frame);
        }
      }

      // Side analysis
      if (phase === 'side-readiness' || phase === 'side-countdown' || phase === 'side-measuring') {
        const raw = smoothMetrics(analyzeSide(lm, w, h));
        const st: Record<string, MetricStatus> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (k.endsWith('Status') && typeof v === 'string') st[k.replace('Status', '')] = v as MetricStatus;
        }
        setStatuses(st);

        if (phase === 'side-measuring') {
          const frame = { time: performance.now() - measureStartRef.current, metrics: {} as Record<string, number> };
          for (const [k, v] of Object.entries(raw)) {
            if (typeof v === 'number') frame.metrics[k] = v;
          }
          store.addSideFrame(frame);
        }
      }

      // Readiness
      if (phase === 'readiness') {
        const checks = READINESS_FRONT;
        const res = checkReady(lm, checks);
        setReadinessResults(res);
        if (res.every(Boolean)) {
          readinessPassRef.current++;
          setReadinessPassCount(readinessPassRef.current);
          if (readinessPassRef.current >= READINESS_FRAMES_NEEDED) {
            setAllPassed(true);
            setTimeout(() => {
              setAllPassed(false);
              startCountdown('front');
            }, 600);
          }
        } else {
          readinessPassRef.current = 0;
          setReadinessPassCount(0);
        }
      }

      if (phase === 'side-readiness') {
        const checks = READINESS_SIDE;
        const res = checkReady(lm, checks);
        setReadinessResults(res);
        if (res.every(Boolean)) {
          readinessPassRef.current++;
          setReadinessPassCount(readinessPassRef.current);
          if (readinessPassRef.current >= READINESS_FRAMES_NEEDED) {
            setAllPassed(true);
            setTimeout(() => {
              setAllPassed(false);
              startCountdown('side');
            }, 600);
          }
        } else {
          readinessPassRef.current = 0;
          setReadinessPassCount(0);
        }
      }
    };
    animRef.current = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modelReady && videoRef.current) {
      startDetectionLoop();
    }
  }, [modelReady, startDetectionLoop]);

  const startCountdown = (view: 'front' | 'side') => {
    const countdownPhase = view === 'front' ? 'countdown' : 'side-countdown';
    const measuringPhase = view === 'front' ? 'measuring' : 'side-measuring';
    store.setPhase(countdownPhase as typeof store.phase);
    store.setCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      store.setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        store.setPhase(measuringPhase as typeof store.phase);
        measureStartRef.current = performance.now();
        startMeasureTimer(view);
      }
    }, 1000);
  };

  const startMeasureTimer = (view: 'front' | 'side') => {
    const donePhase = view === 'front' ? 'done' : 'side-done';
    const interval = setInterval(() => {
      const elapsed = (performance.now() - measureStartRef.current) / 1000;
      store.setElapsed(Math.min(elapsed, MEASURE_DURATION));
      if (elapsed >= MEASURE_DURATION) {
        clearInterval(interval);
        store.setPhase(donePhase as typeof store.phase);
        resetSmoothing();

        if (donePhase === 'done' && store.sessionType === 'quick') {
          finishQuickScan();
        }
      }
    }, 100);
  };

  const finishQuickScan = () => {
    const metrics = computeFrontMetrics(framesRef.current);
    const score = computeOverallScore(metrics);
    store.setFrontMetrics(metrics);
    store.setOverallScore(score);
    saveSession(metrics, score, 'front');
  };

  const handleNextSide = () => {
    const metrics = computeFrontMetrics(framesRef.current);
    store.setFrontMetrics(metrics);
    resetSmoothing();
    readinessPassRef.current = 0;
    setReadinessPassCount(0);
    setReadinessResults([]);
    store.setPhase('side-readiness');
  };

  const finishFullAssessment = () => {
    const metrics = computeFullMetrics(framesRef.current, sideFramesRef.current);
    const score = computeOverallScore(metrics);
    store.setFrontMetrics(metrics);
    store.setOverallScore(score);
    saveSession(metrics, score, 'both');
  };

  const saveSession = async (metrics: ReturnType<typeof computeFrontMetrics>, score: number, angle: 'front' | 'both') => {
    if (!profile) return;
    const session: Session = {
      id: crypto.randomUUID(),
      profileId: profile.id,
      type: store.sessionType,
      angle,
      timestamp: new Date(),
      duration: MEASURE_DURATION,
      metrics,
      overallScore: score,
    };
    await addSession(session);
    selectSession(session);
    setPage('report');
  };

  const startReadiness = () => {
    readinessPassRef.current = 0;
    setReadinessPassCount(0);
    setReadinessResults([]);
    setAllPassed(false);
    store.setPhase('readiness');
  };

  const handleCancel = () => {
    store.reset();
    resetSmoothing();
    setPage('home');
  };

  const flipCamera = () => {
    store.setFacingMode(store.facingMode === 'user' ? 'environment' : 'user');
  };

  const phase = store.phase;
  const isQuick = store.sessionType === 'quick';

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={handleCancel} className="text-white text-sm px-3 py-1 rounded-full bg-white/20">
          {tr.analysis.cancel}
        </button>
        <span className="text-white font-semibold">
          {isQuick ? tr.analysis.quick : tr.analysis.full}
          {(phase === 'side-readiness' || phase === 'side-countdown' || phase === 'side-measuring') && ` — ${tr.analysis.side}`}
        </span>
        <button onClick={flipCamera} className="text-white text-sm px-3 py-1 rounded-full bg-white/20">
          🔄
        </button>
      </div>

      {/* Camera + Overlay */}
      <div className="flex-1 relative overflow-hidden">
        {phase === 'loading' ? (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mb-4" />
            <p className="text-lg">{loadStatus}</p>
            <p className="text-sm opacity-60 mt-1">{tr.analysis.loadingFirst}</p>
          </div>
        ) : (
          <>
            <Camera onVideoReady={onVideoReady} />
            <PoseOverlay
              landmarks={landmarks}
              videoWidth={videoSize.w}
              videoHeight={videoSize.h}
              statuses={statuses}
            />
          </>
        )}

        {/* Readiness overlay */}
        {(phase === 'readiness' || phase === 'side-readiness') && (
          <ReadinessOverlay
            checks={phase === 'readiness' ? READINESS_FRONT : READINESS_SIDE}
            results={readinessResults}
            allPassed={allPassed}
          />
        )}

        {/* Countdown overlay */}
        {(phase === 'countdown' || phase === 'side-countdown') && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <span className="text-8xl font-bold text-white animate-pulse">{store.countdown}</span>
          </div>
        )}

        {/* Measuring overlay */}
        {(phase === 'measuring' || phase === 'side-measuring') && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
            <div className="bg-black/60 rounded-xl p-3">
              <div className="flex justify-between text-white text-sm mb-2">
                <span>{tr.analysis.measuring}</span>
                <span>{Math.floor(store.elapsed)}{tr.analysis.seconds} / {MEASURE_DURATION}{tr.analysis.seconds}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${(store.elapsed / MEASURE_DURATION) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 p-4 bg-black safe-area-bottom">
        {phase === 'ready' && (
          <button
            onClick={startReadiness}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-lg"
          >
            {tr.analysis.startMeasure}
          </button>
        )}

        {phase === 'done' && !isQuick && (
          <button
            onClick={handleNextSide}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-lg"
          >
            {tr.analysis.nextSide}
          </button>
        )}

        {phase === 'side-done' && (
          <button
            onClick={finishFullAssessment}
            className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold text-lg"
          >
            {tr.analysis.finish}
          </button>
        )}
      </div>
    </div>
  );
}
