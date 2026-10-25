import React, { useState, useEffect } from 'react';
import { Search, Mail, AtSign, ArrowRight, CornerDownLeft } from 'lucide-react';
import { classifyQuery } from '../hooks/useOsintScanner.js';
import type { ScanPhase } from '../types/osint.js';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  phase: ScanPhase;
  defaultMode?: 'email' | 'username';
}

const SAMPLES = ['octocat', 'torvalds', 'name@domain.com'];

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  onSearch,
  phase,
  defaultMode,
}) => {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const classification = classifyQuery(query);
  const isScanning = phase === 'connecting' || phase === 'scanning';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isScanning) {
      onSearch(query.trim());
    }
  };

  const handleExample = (sample: string) => {
    setQuery(sample);
    onSearch(sample);
  };

  const kindLabel =
    classification.kind === 'email'
      ? 'Email'
      : classification.kind === 'username'
      ? 'Handle'
      : classification.kind === 'phone'
      ? 'Phone'
      : classification.kind === 'invalid' && query.trim().length > 0
      ? 'Unrecognized'
      : null;

  const Icon =
    classification.kind === 'email'
      ? Mail
      : classification.kind === 'username'
      ? AtSign
      : Search;

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleSubmit} aria-busy={isScanning}>
        <div
          className={`relative flex items-center gap-2 overflow-hidden rounded-xl border bg-[#0a0c0e]/90 p-1.5 pl-3.5 backdrop-blur-sm transition-all duration-200 ${
            isScanning
              ? 'border-accent/30 shadow-[0_0_0_3px_rgba(143,184,255,0.05)]'
              : 'border-white/[0.1] focus-within:border-accent/40 focus-within:bg-[#0b0d0f] focus-within:shadow-[0_0_0_3px_rgba(143,184,255,0.06)]'
          }`}
        >
          <Icon
            className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
              isScanning
                ? 'text-accent'
                : classification.kind === 'email' || classification.kind === 'username'
                ? 'text-accent'
                : 'text-faint'
            }`}
            strokeWidth={1.6}
            style={isScanning ? { animation: 'pulse-soft 1.4s ease-in-out infinite' } : undefined}
          />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isScanning}
            placeholder={
              defaultMode === 'email'
                ? 'name@domain.com'
                : 'Email address or username'
            }
            aria-label="Email address or username"
            className="h-9 min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-paper placeholder:font-sans placeholder:text-faint focus:outline-none disabled:opacity-50"
            autoFocus
          />

          {kindLabel && (
            <span
              className={`hidden shrink-0 rounded-[5px] border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] sm:block ${
                classification.kind === 'invalid'
                  ? 'border-white/10 text-faint'
                  : 'border-accent/25 bg-accent/[0.08] text-accent'
              }`}
            >
              {kindLabel}
            </span>
          )}

          <button
            type="submit"
            disabled={!query.trim() || isScanning}
            className="btn btn-primary h-9 shrink-0 gap-1.5 pl-3 pr-2.5"
          >
            {isScanning ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-ink/25 border-t-ink" />
                <span>Probing</span>
              </>
            ) : (
              <>
                <span>Scan</span>
                <CornerDownLeft className="h-3 w-3 opacity-40" />
              </>
            )}
          </button>

          {/* Sweep: the only moving element while a scan is running */}
          {isScanning && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px">
              <span
                className="block h-px w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent"
                style={{ animation: 'sweep 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite' }}
              />
            </span>
          )}
        </div>
      </form>

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
        <span className="label mr-0.5">Try</span>
        {SAMPLES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => handleExample(sample)}
            disabled={isScanning}
            className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[10.5px] text-dim transition-colors duration-200 hover:border-white/[0.14] hover:text-paper disabled:opacity-40"
          >
            {sample}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
        <p className="text-[10.5px] text-faint">
          Public endpoints only · no authentication required
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
      </div>
    </div>
  );
};
