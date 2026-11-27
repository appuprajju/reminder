import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, ExternalLink, Mail, X } from 'lucide-react';

export interface ConfirmActionSpec {
  kind: 'calendar-add' | 'gmail-send';
  title: string;
  description: string;
  confirmLabel: string;
  previewLines: { label: string; value: string }[];
  bodyPreview?: string;
  externalHref?: string;
  onConfirm: () => Promise<void>;
}

interface ConfirmActionModalProps {
  action: ConfirmActionSpec | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  action,
  busy,
  onCancel,
  onConfirm,
}) => {
  if (!action) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={action.title}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="glass-elevated animate-sheet-up flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-sky-500/20 text-sky-300">
              {action.kind === 'calendar-add' ? (
                <CalendarPlus className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">{action.title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{action.description}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Cancel action"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <dl className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs">
            {action.previewLines.map((line) => (
              <div key={line.label} className="flex items-start justify-between gap-3 py-2.5">
                <dt className="shrink-0 text-slate-400">{line.label}</dt>
                <dd className="text-right font-medium text-slate-100">{line.value}</dd>
              </div>
            ))}
          </dl>

          {action.bodyPreview && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#060812]/70 p-3.5">
              <p className="text-[11px] font-medium text-slate-400">Message preview</p>
              <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-200">
                {action.bodyPreview}
              </pre>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-t border-white/[0.08] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="ios-spring-press min-h-[48px] rounded-xl border border-white/[0.1] bg-white/[0.05] text-sm font-semibold text-slate-200 hover:bg-white/[0.1] disabled:opacity-50"
          >
            Cancel
          </button>
          {action.externalHref ? (
            <a
              href={action.externalHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCancel}
              className="liquid-primary-btn ios-spring-press flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white"
            >
              <span>{action.confirmLabel}</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="liquid-primary-btn ios-spring-press min-h-[48px] rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Working…' : action.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

