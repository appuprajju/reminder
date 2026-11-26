import React, { useState } from 'react';

interface IosSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  accent?: 'emerald' | 'azure' | 'coral';
  disabled?: boolean;
}

export const IosSwitch: React.FC<IosSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  accent = 'emerald',
  disabled = false,
}) => {
  const [pressed, setPressed] = useState(false);

  const activeTrackClass =
    accent === 'azure'
      ? 'bg-[#0A84FF] shadow-[0_0_16px_rgba(10,132,255,0.45)]'
      : accent === 'coral'
        ? 'bg-[#FF453A] shadow-[0_0_16px_rgba(255,69,58,0.45)]'
        : 'bg-[#30D158] shadow-[0_0_16px_rgba(48,209,88,0.42)]';

  const thumbTransform = checked
    ? pressed
      ? 'translate3d(17px, 0, 0) scaleX(1.14)'
      : 'translate3d(20px, 0, 0) scaleX(1)'
    : pressed
      ? 'translate3d(0px, 0, 0) scaleX(1.14)'
      : 'translate3d(0px, 0, 0) scaleX(1)';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] min-w-[54px] shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A84FF] disabled:opacity-50"
    >
      <span
        className={`ios-switch-track relative inline-flex h-[31px] w-[51px] items-center rounded-full border border-white/15 p-[2px] ${
          checked ? activeTrackClass : 'bg-white/[0.14]'
        }`}
      >
        <span
          style={{
            transform: thumbTransform,
            transformOrigin: checked ? 'right center' : 'left center',
          }}
          className="ios-switch-thumb block h-[25px] w-[25px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.34),0_1px_2px_rgba(0,0,0,0.2)]"
        />
      </span>
    </button>
  );
};
