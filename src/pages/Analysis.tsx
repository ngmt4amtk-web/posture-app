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

// Guide screen component
function GuideScreen({ view, onReady, onCancel, lang }: {
  view: 'front' | 'side';
  onReady: () => void;
  onCancel: () => void;
  lang: 'ja' | 'en';
}) {
  const tr = t(lang);
  const guide = tr.guide;
  const isFront = view === 'front';
  const title = isFront ? guide.frontTitle : guide.sideTitle;
  const steps = isFront ? guide.frontSteps : guide.sideSteps;
  const tip = isFront ? guide.frontTip : guide.sideTip;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between p-4">
        <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 text-sm px-3 py-1">
          {tr.analysis.cancel}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {tr.analysis.step} {isFront ? '1' : '2'} {tr.analysis.of} {isFront ? '1' : '2'}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Visual diagram */}
        <div className="w-48 h-48 mb-6 flex items-center justify-center">
          {isFront ? (
            <div className="relative">
              {/* Stick figure - front view */}
              <svg viewBox="0 0 120 200" className="w-32 h-44">
                {/* Head */}
                <circle cx="60" cy="25" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Body */}
                <line x1="60" y1="40" x2="60" y2="110" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Arms */}
                <line x1="60" y1="55" x2="30" y2="90" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                <line x1="60" y1="55" x2="90" y2="90" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Legs */}
                <line x1="60" y1="110" x2="40" y2="170" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                <line x1="60" y1="110" x2="80" y2="170" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Camera indicator */}
                <rect x="45" y="185" width="30" height="8" rx="2" fill="currentColor" className="text-gray-400" />
                <text x="60" y="198" textAnchor="middle" fontSize="7" fill="currentColor" className="text-gray-400">{guide.distanceHint}</text>
                {/* Arrow showing distance */}
                <line x1="60" y1="175" x2="60" y2="183" stroke="currentColor" strokeWidth="1" strokeDasharray="2" className="text-gray-400" />
              </svg>
            </div>
          ) : (
            <div className="relative">
              {/* Stick figure - side view */}
              <svg viewBox="0 0 120 200" className="w-32 h-44">
                {/* Head */}
                <circle cx="55" cy="25" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Body - slight natural curve */}
                <path d="M55 40 Q58 75 55 110" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Arms */}
                <line x1="55" y1="55" x2="45" y2="90" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* Legs */}
                <line x1="55" y1="110" x2="50" y2="170" stroke="currentColor" strokeWidth="2" className="text-primary-500" />
                {/* 90° rotation arrow */}
                <path d="M85 100 A20 20 0 0 1 85 130" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500" />
                <polygon points="85,130 82,124 88,124" fill="currentColor" className="text-amber-500" />
                <text x="95" y="118" fontSize="8" fill="currentColor" className="text-amber-500">90°</text>
                {/* Camera */}
                <rect x="45" y="185" width="30" height="8" rx="2" fill="currentColor" className="text-gray-400" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{title}</h2>

        {/* Steps */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          {steps.map((step: string, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">{step}</p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="w-full max-w-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 text-center">{tip}</p>
        </div>
      </div>

      <div className="p-4 safe-area-bottom">
        <button
          onClick={onReady}
          className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-lg"
        >
          {guide.ready}
        </button>
      </div>
    </div>
  );
}

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
  const [showGuide, setShowGuide] = useState<'front' | 'side' | null>('front');

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
    // Show side guide before starting side measurement
    setShowGuide('side');
  };

  const handleSideGuideReady = () => {
    setShowGuide(null);
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

  const dismissGuide = () => {
    setShowGuide(null);
    // Phase is already 'ready' if MediaPipe loaded, or 'loading' if not.
    // The "Start Measurement" button will appear when phase === 'ready'.
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

  // Show guide screen
  if (showGuide) {
    return (
      <GuideScreen
        view={showGuide}
        onReady={showGuide === 'front' ? dismissGuide : handleSideGuideReady}
        onCancel={handleCancel}
        lang={lang}
      />
    );
  }

  const isMeasuring = phase === 'measuring' || phase === 'side-measuring';
  const remaining = Math.max(0, MEASURE_DURATION - store.elapsed);
  const timerPct = (store.elapsed / MEASURE_DURATION) * 100;

  // Get top 3 live statuses for display
  const liveMetrics = [
    { key: 'headTilt', label: 'Head Tilt', icon: 'face' },
    { key: 'shoulderLevel', label: 'Shoulders', icon: 'accessibility_new' },
    { key: 'trunkLean', label: 'Spine Align', icon: 'favorite' },
  ];

  return (
    <div className="h-full flex flex-col bg-bg-dark relative">
      {/* Top App Bar */}
      <div className="absolute top-0 left-0 w-full z-30 pt-12 pb-4 px-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={handleCancel} className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            {isMeasuring && (
              <span className="text-xs uppercase tracking-widest text-primary/80 font-bold mb-0.5">
                {tr.analysis.measuring}
              </span>
            )}
            <h2 className="text-white text-base font-semibold drop-shadow-md">
              {isQuick ? tr.analysis.quick : tr.analysis.full}
              {(phase === 'side-readiness' || phase === 'side-countdown' || phase === 'side-measuring') && ` — ${tr.analysis.side}`}
            </h2>
          </div>
          <button onClick={flipCamera} className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined">cameraswitch</span>
          </button>
        </div>
      </div>

      {/* Camera area */}
      <div className="relative flex-grow w-full bg-slate-900 overflow-hidden">
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

            {/* Corner brackets */}
            <div className="absolute top-1/4 left-6 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-1/4 right-6 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-1/4 left-6 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-1/4 right-6 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-lg pointer-events-none" />
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

        {/* Timer ring overlay (during measuring) */}
        {isMeasuring && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${timerPct}, 100`}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.6))' }}
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white tabular-nums tracking-tighter drop-shadow-lg">
                  {Math.ceil(remaining)}
                </span>
                <span className="text-[10px] uppercase text-white/80 font-medium tracking-wider -mt-1">Sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Status chip */}
        {landmarks && (phase === 'readiness' || phase === 'side-readiness' || isMeasuring) && (
          <div className="absolute bottom-4 left-0 w-full flex justify-center z-10 px-6">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
              <span className="relative flex w-2.5 h-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
              </span>
              <span className="text-white text-xs font-medium tracking-wide">
                {isMeasuring ? tr.analysis.measuring : tr.analysis.readinessHint}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="bg-bg-dark border-t border-white/5 relative z-30 pt-1 pb-6 rounded-t-3xl -mt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>
        <div className="px-5">
          {/* Live Metrics during measuring */}
          {isMeasuring && (
            <>
              <div className="flex items-center justify-between mb-4 mt-2">
                <h3 className="text-white font-semibold text-lg">Live Metrics</h3>
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sensors</span>
                  <span>AI Active</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {liveMetrics.map(({ key, label, icon }) => {
                  const st = statuses[key];
                  const isGood = st === 'good';
                  return (
                    <div key={key} className="bg-surface-dark border border-white/5 rounded-2xl p-3 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-20">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>{icon}</span>
                      </div>
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">{label}</span>
                      <div className="flex items-end gap-1 mt-1">
                        <span className="text-xl font-bold text-white">
                          {st ? (isGood ? 'OK' : '!') : '—'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : st === 'warning' ? 'bg-amber-500' : st === 'bad' ? 'bg-rose-500' : 'bg-white/10'}`} style={{ width: isGood ? '80%' : st === 'warning' ? '50%' : '30%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="mt-4">
            {phase === 'loading' && (
              <div className="text-center py-2">
                <p className="text-slate-400 text-sm">{loadStatus}</p>
              </div>
            )}
            {phase === 'ready' && (
              <button onClick={startReadiness} className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-lg transition-transform active:scale-[0.98]">
                {tr.analysis.startMeasure}
              </button>
            )}
            {phase === 'done' && !isQuick && (
              <button onClick={handleNextSide} className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-lg transition-transform active:scale-[0.98]">
                {tr.analysis.nextSide}
              </button>
            )}
            {phase === 'side-done' && (
              <button onClick={finishFullAssessment} className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-lg transition-transform active:scale-[0.98]">
                {tr.analysis.finish}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
