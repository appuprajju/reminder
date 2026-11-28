import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCheck, CheckSquare, Square, Trash2, X } from 'lucide-react';

interface BulkActionBarProps {
  open: boolean;
  selectedCount: number;
  visibleCount: number;
  pendingSelectedCount: number;
  allVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  onBulkComplete: () => void;
  onRequestBulkDelete: () => void;
  onCancel: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  open,
  selectedCount,
  visibleCount,
  pendingSelectedCount,
  allVisibleSelected,
  onToggleSelectAll,
  onBulkComplete,
  onRequestBulkDelete,
  onCancel,
}) => {
  if (!open) return null;

  const canComplete = pendingSelectedCount > 0;
  const canDelete = selectedCount > 0;
  const completeLabel =
    selectedCount > 0 && pendingSelectedCount === 0 ? 'All Done' : 'Mark Done';

  const dock = (
    <div
      role="region"
      aria-label="Bulk reminder actions"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 px-3 sm:px-6 lg:bottom-6 lg:left-64 lg:px-8"
    >
      <div className="animate-sheet-up pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/20 bg-[#0D142B]/92 px-3 py-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl sm:flex-nowrap sm:gap-3 sm:px-4">
        {/* Left: Count + Select All / Clear toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectAll}
            disabled={visibleCount === 0}
            aria-label={allVisibleSelected ? 'Clear all selected reminders' : 'Select all visible reminders'}
            className="ios-spring-press inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/[0.12] disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            {allVisibleSelected ? (
              <CheckSquare className="h-4 w-4 text-sky-300" />
            ) : (
              <Square className="h-4 w-4 text-slate-300" />
            )}
            <span>{allVisibleSelected ? 'Clear' : 'Select All'}</span>
          </button>

          <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums whitespace-nowrap">
            {selectedCount} selected
          </span>
        </div>

        {/* Right: Mark Done + Delete + Exit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBulkComplete}
            disabled={!canComplete}
            aria-label={
              canComplete
                ? `Mark ${pendingSelectedCount} selected reminder${pendingSelectedCount === 1 ? '' : 's'} as completed`
                : 'No pending reminders selected to complete'
            }
            className="ios-spring-press inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-[#30D158]/20 px-3.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-[#30D158]/30 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            <CheckCheck className="h-4 w-4 shrink-0" />
            <span>{completeLabel}</span>
          </button>

          <button
            type="button"
            onClick={onRequestBulkDelete}
            disabled={!canDelete}
            aria-label={
              canDelete
                ? `Delete ${selectedCount} selected reminder${selectedCount === 1 ? '' : 's'}`
                : 'Select reminders to delete'
            }
            className="ios-spring-press inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-400/35 bg-[#FF453A]/20 px-3.5 text-xs font-semibold text-red-100 transition-colors hover:bg-[#FF453A]/32 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-slate-500 whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Exit selection mode"
            title="Exit selection mode (Esc)"
            className="ios-spring-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.05] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dock, document.body) : dock;
};
