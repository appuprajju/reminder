import React, { useRef } from 'react';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
}

/**
 * iOS Liquid Glass interactive surface with specular pointer glare and subtle
 * 3D perspective tilt on fine pointer devices (desktop/trackpad).
 */
export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  enableTilt = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || e.pointerType !== 'mouse') return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 7;
    const ry = (px - 0.5) * 8;
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    el.setAttribute('data-tilting', 'true');
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.removeAttribute('data-tilting');
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`glass-surface liquid-tilt ${className}`}
    >
      {children}
    </div>
  );
};
