import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '../stores/analysisStore';

interface Props {
  onVideoReady: (video: HTMLVideoElement) => void;
}

export function Camera({ onVideoReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingMode = useAnalysisStore((s) => s.facingMode);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error('Camera access failed:', e);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const handleLoadedData = () => {
    if (videoRef.current) {
      onVideoReady(videoRef.current);
    }
  };

  const isMirrored = facingMode === 'user';

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      onLoadedData={handleLoadedData}
      className={`w-full h-full object-cover ${isMirrored ? 'mirror' : ''}`}
    />
  );
}
