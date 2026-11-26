import React from 'react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SpringSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export function SpringSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  fullWidth = false,
}: SpringSegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  const count = Math.max(1, options.length);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative grid rounded-2xl border border-white/[0.12] bg-[#0B1022]/85 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        fullWidth ? 'w-full' : 'inline-grid'
      }`}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {/* Continuous Sliding Liquid Glass Pill */}
      <div
        aria-hidden="true"
        className="ios-pill-slider pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl border border-white/30 bg-gradient-to-b from-[#4BA3FF] to-[#0A84FF] shadow-[0_6px_18px_rgba(10,132,255,0.42),inset_0_1px_0_rgba(255,255,255,0.5)]"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
        }}
      />

      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`relative z-10 flex items-center justify-center rounded-xl font-semibold transition-colors duration-150 whitespace-nowrap ${
              size === 'sm' ? 'min-h-[34px] px-3 text-xs' : 'min-h-[38px] px-3.5 text-xs'
            } ${selected ? 'text-white' : 'text-slate-400 hover:text-slate-100'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
