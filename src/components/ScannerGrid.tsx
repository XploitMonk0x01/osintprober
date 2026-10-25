import React from 'react';
import type { ScannerState } from '../types/osint.js';
import { PLATFORMS_CATALOG } from '../../server/platforms.js';

interface ScannerGridProps {
  state: ScannerState;
}

export const ScannerGrid: React.FC<ScannerGridProps> = ({ state }) => {
  const { phase, mode, cells, cellNotes, scanned, hits, total, durationMs, message } = state;
  const unresolvedCount = Object.values(cells).filter((v) => v === 'unresolved').length;
  const isScanning = phase === 'scanning' || phase === 'connecting';
  const progressPercent =
    total > 0 ? Math.min(100, Math.round((scanned / total) * 100)) : 0;

  const platforms = PLATFORMS_CATALOG.filter(
    (p) => p.checkType === 'both' || p.checkType === mode
  );

  const statusLabel =
    phase === 'scanning'
      ? 'Probing'
      : phase === 'done'
      ? 'Complete'
      : phase === 'connecting'
      ? 'Connecting'
      : 'Idle';

  return (
    <div className="panel overflow-hidden">
      {/* Status + live counters */}
      <div className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isScanning
                ? 'bg-accent'
                : phase === 'done'
                ? 'bg-accent/70'
                : 'bg-white/25'
            }`}
            style={isScanning ? { animation: 'pulse-soft 1.6s ease-in-out infinite' } : undefined}
          />
          <span className="text-[12px] font-medium tracking-[-0.01em] text-paper">
            {statusLabel}
          </span>
          {message && (
            <span className="hidden truncate font-mono text-[10.5px] text-faint sm:block">
              {message}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-[10.5px] tabular-nums text-faint">
          <span>
            scanned <span className="text-paper">{scanned}</span>
            <span className="text-faint/70"> / {total}</span>
          </span>
          <span>
            hits <span className={hits > 0 ? 'text-accent' : 'text-paper'}>{hits}</span>
          </span>
          {unresolvedCount > 0 && (
            <span className="text-dim">
              unverified <span className="text-paper">{unresolvedCount}</span>
            </span>
          )}
          {durationMs !== null && (
            <span className="text-dim">{(durationMs / 1000).toFixed(2)}s</span>
          )}
        </div>
      </div>

      {/* Hairline progress + sweep while probing */}
      <div className="relative h-px w-full overflow-hidden bg-white/[0.06]">
        <div
          className="h-px bg-accent transition-[width] duration-200 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
        {isScanning && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            style={{ animation: 'sweep 1.6s cubic-bezier(0.45, 0, 0.55, 1) infinite' }}
          />
        )}
      </div>

      {/* Platform matrix — hairlines only, no fills */}
      <div className="grid max-h-[212px] grid-cols-3 gap-px overflow-y-auto bg-white/[0.06] sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {platforms.map((platform) => {
          const outcome = cells[platform.id];
          const pending = isScanning && !outcome;
          const note = cellNotes[platform.id];

          return (
            <div
              key={platform.id}
              title={`${platform.label} — ${outcome ?? 'waiting'}${note ? ` · ${note}` : ''}`}
              className={`flex items-center gap-1.5 bg-[#08090b] px-2.5 py-2 font-mono text-[10px] transition-colors duration-200 ${
                outcome === 'hit'
                  ? 'text-paper'
                  : outcome === 'miss'
                  ? 'text-faint/60'
                  : outcome === 'unresolved'
                  ? 'text-dim'
                  : pending
                  ? 'text-faint/70'
                  : 'text-faint/50'
              }`}
            >
              <span className="flex h-1.5 w-1.5 shrink-0 items-center justify-center">
                {outcome === 'hit' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                ) : outcome === 'unresolved' ? (
                  <span className="text-[9px] leading-none text-dim">~</span>
                ) : pending ? (
                  <span
                    className="h-1 w-1 rounded-full bg-white/40"
                    style={{ animation: 'pulse-soft 1.4s ease-in-out infinite' }}
                  />
                ) : (
                  <span className="h-1 w-1 rounded-full border border-white/20" />
                )}
              </span>
              <span className="truncate">{platform.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] px-4 py-2.5 text-[10.5px] text-faint sm:px-5">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Discovered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full border border-white/25" />
          Not found
        </span>
        <span className="flex items-center gap-1.5 font-mono">
          <span className="text-dim">~</span>
          Unverified
        </span>
      </div>
    </div>
  );
};
