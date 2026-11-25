import React, { useEffect, useRef } from 'react';

/**
 * GPU-composited 3D ambient liquid-glass backdrop with layered volumetric spheres
 * and on-demand pointer parallax on desktop (zero idle rAF / zero CPU burn when still).
 */
export const Liquid3DBackground: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (prefersReduced || isCoarse) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currX = 0;
    let currY = 0;

    const tick = () => {
      rafId = 0;
      if (document.hidden) return;
      const dx = targetX - currX;
      const dy = targetY - currY;
      currX += dx * 0.08;
      currY += dy * 0.08;
      if (stageRef.current) {
        stageRef.current.style.setProperty('--px', `${currX.toFixed(4)}`);
        stageRef.current.style.setProperty('--py', `${currY.toFixed(4)}`);
      }
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!rafId && !document.hidden) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className="liquid-3d-scene pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Volumetric 3D liquid glass spheres at distinct Z-parallax depths */}
      <div
        className="liquid-orb liquid-orb-1"
        style={{
          width: '340px',
          height: '340px',
          top: '-6%',
          left: '-4%',
          ['--c1' as string]: '#4ea8ff',
          ['--c2' as string]: '#18379c',
          ['--depth' as string]: '26px',
          ['--dur' as string]: '13s',
        }}
      />
      <div
        className="liquid-orb liquid-orb-2"
        style={{
          width: '280px',
          height: '280px',
          top: '14%',
          right: '-5%',
          ['--c1' as string]: '#32d7ff',
          ['--c2' as string]: '#0b4f85',
          ['--depth' as string]: '-22px',
          ['--dur' as string]: '16s',
        }}
      />
      <div
        className="liquid-orb liquid-orb-3"
        style={{
          width: '380px',
          height: '380px',
          bottom: '-12%',
          left: '26%',
          ['--c1' as string]: '#c06bff',
          ['--c2' as string]: '#58196f',
          ['--depth' as string]: '18px',
          ['--dur' as string]: '19s',
        }}
      />
      <div
        className="liquid-orb liquid-orb-4 hidden sm:block"
        style={{
          width: '170px',
          height: '170px',
          top: '54%',
          left: '8%',
          ['--c1' as string]: '#5eead4',
          ['--c2' as string]: '#0e5866',
          ['--depth' as string]: '-34px',
          ['--dur' as string]: '11s',
        }}
      />
      <div
        className="liquid-orb liquid-orb-5 hidden md:block"
        style={{
          width: '140px',
          height: '140px',
          bottom: '16%',
          right: '12%',
          ['--c1' as string]: '#7c8cff',
          ['--c2' as string]: '#2c2378',
          ['--depth' as string]: '30px',
          ['--dur' as string]: '14s',
        }}
      />

      {/* Subtle architectural refractive 3D depth ring */}
      <div className="liquid-depth-ring" />
    </div>
  );
};
