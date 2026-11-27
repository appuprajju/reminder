import React, { useEffect, useRef } from 'react';
import {
  INTRO_VIDEO_HEIGHT,
  INTRO_VIDEO_WIDTH,
  renderIntroFrame,
} from '../lib/introVideoRenderer';

declare global {
  interface Window {
    __renderIntroReady?: boolean;
    __renderIntroFrame?: (timeSec: number) => void;
  }
}

/**
 * Deterministic 1280x720 canvas harness mounted only when `?renderIntro=1` is passed,
 * used by scripts/render-intro-video.mjs to export crisp 30fps HD MP4 frames.
 */
export const IntroVideoHarness: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logo = new Image();
    logo.src = '/icons/icon-192.png';

    const init = () => {
      window.__renderIntroFrame = (timeSec: number) => {
        renderIntroFrame(ctx, timeSec, INTRO_VIDEO_WIDTH, INTRO_VIDEO_HEIGHT, logo);
      };
      window.__renderIntroFrame(0);
      window.__renderIntroReady = true;
    };

    logo.onload = init;
    logo.onerror = init;
    if (logo.complete) init();

    return () => {
      delete window.__renderIntroFrame;
      delete window.__renderIntroReady;
    };
  }, []);

  return (
    <div className="fixed inset-0 m-0 flex items-center justify-center bg-[#050712] p-0">
      <canvas
        ref={canvasRef}
        id="intro-render-canvas"
        width={INTRO_VIDEO_WIDTH}
        height={INTRO_VIDEO_HEIGHT}
        className="block h-[720px] w-[1280px]"
      />
    </div>
  );
};
