import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Globe, MapPin, Search, X } from 'lucide-react';
import {
  APP_LANGUAGES,
  INDIA_STATES_AND_UTS,
  filterLanguagesByQuery,
  filterStatesByQuery,
  getLanguageOption,
  getLanguagesForState,
  type IndianLanguageOption,
} from '../lib/indianLanguages';
import { SpringSegmentedControl } from './SpringSegmentedControl';

interface LanguagePickerModalProps {
  open: boolean;
  selectedLanguage: string;
  onSelectLanguage: (langCode: string) => void;
  onClose: () => void;
}

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({
  open,
  selectedLanguage,
  onSelectLanguage,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'states' | 'languages'>('states');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const activeOption = useMemo(() => getLanguageOption(selectedLanguage), [selectedLanguage]);
  const filteredStates = useMemo(() => filterStatesByQuery(query), [query]);
  const filteredLanguages = useMemo(() => filterLanguagesByQuery(query), [query]);

  if (!open) return null;

  const choose = (lang: IndianLanguageOption) => {
    onSelectLanguage(lang.id);
    onClose();
  };

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose India state or language"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-elevated animate-sheet-up flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.1] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 shrink-0 text-sky-300" />
              <h2 className="font-display text-lg font-bold text-white">
                India State &amp; Regional Languages
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              All 28 States, 8 Union Territories &amp; 22 Scheduled + Regional Languages · Active:{' '}
              <span className="font-semibold text-sky-300">
                {activeOption.nativeName} ({activeOption.name})
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close language picker"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Mode Switcher */}
        <div className="space-y-3 border-b border-white/[0.08] px-5 py-3.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state (Karnataka, Tamil Nadu, Assam…) or language (ಕನ್ನಡ, हिन्दी…)"
              className="min-h-[44px] w-full rounded-xl border border-white/[0.12] bg-[#060812]/80 pr-9 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-[#0A84FF] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <SpringSegmentedControl<'states' | 'languages'>
            ariaLabel="Browse by Indian state or language"
            fullWidth
            value={viewMode}
            onChange={setViewMode}
            options={[
              { id: 'states', label: `By State / UT (${INDIA_STATES_AND_UTS.length})` },
              { id: 'languages', label: `All Languages (${APP_LANGUAGES.length})` },
            ]}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {viewMode === 'states' ? (
            filteredStates.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No matching Indian state or language found.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredStates.map((region) => {
                  const langs = getLanguagesForState(region.id);
                  const primary = langs[0];
                  const hasActive = langs.some((l) => l.id === activeOption.id);
                  return (
                    <div
                      key={region.id}
                      className={`rounded-2xl border p-3.5 transition-colors ${
                        hasActive
                          ? 'border-sky-400/45 bg-sky-500/12'
                          : 'border-white/[0.09] bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                          <p className="truncate text-sm font-semibold text-white">{region.name}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] uppercase text-slate-400">
                          {region.kind === 'state' ? 'State' : 'UT'}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {langs.map((lang) => {
                          const isSelected = lang.id === activeOption.id;
                          const isPrimary = lang.id === primary.id;
                          return (
                            <button
                              key={`${region.id}-${lang.id}`}
                              type="button"
                              onClick={() => choose(lang)}
                              className={`ios-spring-press inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? 'border-sky-400/60 bg-[#0A84FF] text-white'
                                  : isPrimary
                                    ? 'border-white/[0.16] bg-white/[0.09] text-white hover:bg-white/[0.16]'
                                    : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 shrink-0" />}
                              <span>{lang.nativeName}</span>
                              {lang.nativeName !== lang.name && (
                                <span className="text-[10px] opacity-75">· {lang.name}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredLanguages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              No matching language found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredLanguages.map((lang) => {
                const isSelected = lang.id === activeOption.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => choose(lang)}
                    className={`ios-spring-press flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'border-sky-400/60 bg-[#0A84FF]/20 text-white'
                        : 'border-white/[0.09] bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{lang.nativeName}</span>
                        <span className="text-xs font-medium text-slate-300">{lang.name}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {lang.states.slice(0, 3).join(', ')}
                        {lang.states.length > 3 ? ` +${lang.states.length - 3}` : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A84FF] text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
};
