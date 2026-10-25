import React, { useState } from 'react';
import { DossierData } from '../types/dashboard.js';
import { ArrowUpRight, Check, Copy, Image as ImageIcon, Sparkles, UserCheck } from 'lucide-react';

interface DossierCardProps {
  dossier: DossierData;
  onCrossSearch?: (handle: string) => void;
  onViewImage?: (imageUrl: string, title: string) => void;
}

const RowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="label block">{children}</span>
);

export const DossierCard: React.FC<DossierCardProps> = ({
  dossier,
  onCrossSearch,
  onViewImage,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (dossier.userId) {
      navigator.clipboard.writeText(dossier.userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[12.5px] font-medium tracking-[-0.01em] text-paper">
            Synthesized dossier
          </h2>
          <span className="label rounded-[4px] border border-white/[0.08] px-1.5 py-0.5 text-[8.5px]">
            ledger
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-accent">
          <UserCheck className="h-3 w-3" strokeWidth={1.6} />
          <span className="tabular-nums">{dossier.platformsAgreeCount}</span>
          <span className="text-faint">sources responded</span>
        </div>
      </div>

        {/* Ledger rows */}
      <div className="divide-y divide-white/[0.06]">
        {/* Core attributes */}
        <div className="grid grid-cols-1 gap-y-5 px-4 py-5 sm:grid-cols-3 sm:gap-6 sm:px-5">
          <div>
            <RowLabel>Subject</RowLabel>
            <div
              className="mt-1.5 truncate font-mono text-[12px] text-paper"
              title={dossier.subject}
            >
              {dossier.subject}
            </div>
          </div>

          <div>
            <RowLabel>Names returned</RowLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {dossier.names?.length ? (
                dossier.names.slice(0, 4).map((entry, i) => (
                  <span
                    key={`${entry.platform}-${i}`}
                    className="rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[10.5px] text-dim"
                  >
                    {entry.name}
                    <span className="ml-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-faint">
                      {entry.platform}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-[11px] italic text-faint">Not returned by any source</span>
              )}
            </div>
          </div>

          {dossier.userId ? (
            <div>
              <RowLabel>User identifier</RowLabel>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[12px] tracking-wide text-paper">
                  {dossier.userId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="btn btn-quiet h-6 shrink-0 px-1.5 text-[10px]"
                  title="Copy user identifier"
                >
                  {copiedId ? (
                    <Check className="h-3 w-3 text-accent" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                  <span className="font-mono">{copiedId ? 'copied' : 'copy'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <RowLabel>Sources matched</RowLabel>
              <div className="mt-1.5 text-[12px] text-dim">
                {dossier.platformsAgreeCount} public source
                {dossier.platformsAgreeCount === 1 ? '' : 's'} responded
              </div>
            </div>
          )}
        </div>

        {/* Handles */}
        {dossier.handles && dossier.handles.length > 0 && (
          <div className="px-4 py-4 sm:px-5">
            <RowLabel>Discovered handles</RowLabel>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {dossier.handles.map((h, i) => (
                <span
                  key={i}
                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[11px] text-dim"
                >
                  {h}
                </span>
              ))}

              {dossier.handles[0] && onCrossSearch && (
                <button
                  type="button"
                  onClick={() => onCrossSearch(dossier.handles[0].replace(/^@/, ''))}
                  className="link-accent ml-1 text-[11px]"
                >
                  <Sparkles className="h-3 w-3" strokeWidth={1.6} />
                  Cross-probe @{dossier.handles[0].replace(/^@/, '')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Media + links */}
        <div className="grid grid-cols-1 gap-6 px-4 py-4 sm:px-5 md:grid-cols-2">
          <div>
            <RowLabel>Avatars & media</RowLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dossier.profilePictures.length > 0 ? (
                dossier.profilePictures.map((pic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onViewImage?.(pic.url, `${pic.label} avatar`)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10.5px] text-dim transition-colors duration-200 hover:border-white/[0.14] hover:text-paper"
                  >
                    <ImageIcon className="h-3 w-3 text-faint" strokeWidth={1.6} />
                    {pic.label}
                  </button>
                ))
              ) : (
                <span className="text-[11px] text-faint">No public avatars found</span>
              )}
            </div>
          </div>

          <div>
            <RowLabel>Direct profiles</RowLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dossier.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10.5px] text-dim transition-colors duration-200 hover:border-white/[0.14] hover:text-paper"
                >
                  {link.label}
                  <ArrowUpRight className="h-2.5 w-2.5 text-faint" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Linked addresses */}
        {dossier.linkedEmails && dossier.linkedEmails.length > 0 && (
          <div className="px-4 py-4 sm:px-5">
            <RowLabel>Linked addresses</RowLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {dossier.linkedEmails.map((item, i) => (
                <span
                  key={i}
                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[10.5px] text-dim"
                >
                  {item.email}
                  <span className="ml-1.5 font-sans text-faint">via</span>{' '}
                  <span className="text-paper/70">{item.viaPlatform}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
