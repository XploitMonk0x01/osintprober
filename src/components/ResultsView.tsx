import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, AtSign, CheckCircle2, Globe, User } from 'lucide-react';
import type { ProfileCard, ScannerState } from '../types/osint.js';
import { splitEmailResults } from '../hooks/useOsintScanner.js';
import { PLATFORMS_CATALOG } from '../../server/platforms.js';
import { CategoryFilter, type CategoryOption } from './ui/CategoryFilter.js';
import { EASE } from '../lib/motion.js';

interface ResultsViewProps {
  state: ScannerState;
}

const CATEGORY_BY_PLATFORM = new Map(PLATFORMS_CATALOG.map((p) => [p.id, p.category]));

const categoryOf = (card: ProfileCard): string | null =>
  card.category ?? CATEGORY_BY_PLATFORM.get(card.platform) ?? null;

const SectionHead: React.FC<{
  title: string;
  count: number;
  note: string;
  children?: React.ReactNode;
}> = ({ title, count, note, children }) => (
  <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-3">
    <div className="flex items-center gap-2.5">
      <span className="text-faint">{children}</span>
      <h3 className="text-[12px] font-medium tracking-[-0.01em] text-paper">{title}</h3>
      <span className="font-mono text-[10.5px] tabular-nums text-faint">
        {String(count).padStart(2, '0')}
      </span>
    </div>
    <span className="hidden text-[10.5px] text-faint sm:block">{note}</span>
  </div>
);

/** Grid that reflows with FLIP animation when the category filter changes. */
const AnimatedGrid: React.FC<{ className: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={`relative ${className}`}>
    <AnimatePresence mode="popLayout">{children}</AnimatePresence>
  </div>
);

const Item: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'article' | 'div';
  fadeOnly?: boolean;
}> = ({ children, className, as = 'div', fadeOnly = false }) => {
  const Comp = as === 'article' ? motion.article : motion.div;
  return (
    <Comp
      layout
      initial={{ opacity: 0, scale: fadeOnly ? 1 : 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: fadeOnly ? 1 : 0.97 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={className}
    >
      {children}
    </Comp>
  );
};

const EmptyCategory: React.FC<{ onClear: () => void }> = ({ onClear }) => (
  <div className="panel px-5 py-10 text-center">
    <p className="text-[12px] text-dim">No results in this category.</p>
    <button type="button" onClick={onClear} className="link-accent mt-2 text-[11.5px]">
      Show all
    </button>
  </div>
);

export const ResultsView: React.FC<ResultsViewProps> = ({ state }) => {
  const { mode, profiles, mailboxDomains, phase } = state;
  const isDone = phase === 'done';
  const [category, setCategory] = useState('all');

  // Only categories that actually appear in this scan.
  const categories = useMemo<CategoryOption[]>(() => {
    const counts = new Map<string, number>();
    for (const profile of profiles) {
      const value = categoryOf(profile);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [profiles]);

  // A new scan can lose the selected category — fall back to "all".
  useEffect(() => {
    if (category !== 'all' && !categories.some((c) => c.value === category)) {
      setCategory('all');
    }
  }, [categories, category]);

  const matches = (card: ProfileCard) => {
    if (category === 'all') return true;
    const value = categoryOf(card);
    return !value || value === category;
  };

  if (profiles.length === 0 && !isDone) {
    return null;
  }

  const filterBar =
    categories.length > 1 ? (
      <CategoryFilter
        id="scan-results"
        options={categories}
        total={profiles.length}
        value={category}
        onChange={setCategory}
      />
    ) : null;

  /* ------------------------------- email mode ------------------------------ */
  if (mode === 'email') {
    const split = splitEmailResults(profiles);
    const identities = split.identities.filter(matches);
    const registered = split.registered.filter(matches);
    const nothingShown =
      split.identities.length + split.registered.length > 0 &&
      identities.length + registered.length === 0;

    return (
      <div className="space-y-8">
        {mailboxDomains.length > 0 && (
          <div className="panel flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Globe className="h-3.5 w-3.5 text-faint" strokeWidth={1.5} />
              <span className="text-[11.5px] text-dim">Mailbox hosted on</span>
              <span className="font-mono text-[11.5px] text-paper">
                {mailboxDomains.join(', ')}
              </span>
            </div>
            <span className="chip shrink-0 font-mono">DNS MX verified</span>
          </div>
        )}

        {nothingShown ? (
          <EmptyCategory onClear={() => setCategory('all')} />
        ) : (
          <>
            {filterBar && <div className="border-b border-white/[0.07] pb-3">{filterBar}</div>}

            {identities.length > 0 && (
              <section className="space-y-3">
                <SectionHead
                  title="Identified profiles"
                  count={identities.length}
                  note="verified identity records"
                >
                  <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                </SectionHead>

                <AnimatedGrid className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {identities.map((card) => (
                    <Item
                      key={card.card_id || card.id}
                      as="article"
                      className="panel panel-hover flex flex-col justify-between p-4"
                    >
                      <div className="flex items-start gap-3">
                        {card.avatar ? (
                          <img
                            src={card.avatar}
                            alt={card.name || card.handle}
                            className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.1] object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] text-[12px] font-medium text-dim">
                            {(card.name || card.handle || '?')[0].toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="truncate text-[12.5px] font-medium text-paper">
                              {card.name || card.handle || card.label || card.platform}
                            </h4>
                            <span className="label shrink-0 rounded-[4px] border border-white/[0.08] px-1.5 py-0.5 text-[8.5px] text-dim">
                              {card.label || card.platform}
                            </span>
                          </div>

                          {card.handle && (
                            <div className="mt-1 flex items-center gap-0.5 font-mono text-[10.5px] text-faint">
                              <AtSign className="h-2.5 w-2.5" strokeWidth={1.8} />
                              <span className="truncate">
                                {card.handle.replace(/^@/, '')}
                              </span>
                            </div>
                          )}

                          {card.bio && (
                            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-dim">
                              {card.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {card.chips?.map((chip, idx) => (
                            <span key={idx} className="chip">
                              {chip}
                            </span>
                          ))}
                        </div>

                        {card.url && (
                          <a
                            href={card.url}
                            target="_blank"
                            rel="noreferrer"
                            className="link-accent ml-auto shrink-0 text-[11px]"
                          >
                            Profile
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </Item>
                  ))}
                </AnimatedGrid>
              </section>
            )}

            {registered.length > 0 && (
              <section className="space-y-3">
                <SectionHead
                  title="Registered services"
                  count={registered.length}
                  note="confirmed accounts"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </SectionHead>

                <AnimatedGrid className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {registered.map((card) => (
                    <Item
                      key={card.card_id || card.id}
                      fadeOnly
                      className="flex items-center gap-2 bg-[#08090b] px-3 py-2.5"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />
                      <span className="truncate text-[11px] text-dim">
                        {card.label || card.platform}
                      </span>
                    </Item>
                  ))}
                </AnimatedGrid>
              </section>
            )}
          </>
        )}

        {profiles.length === 0 && isDone && (
          <div className="panel px-5 py-10 text-center">
            <p className="text-[12px] text-dim">
              No public profiles or registered services discovered for this identifier.
            </p>
            <p className="mt-1 font-mono text-[10.5px] text-faint">
              Try a different address or switch to a username handle.
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ----------------------------- username mode ----------------------------- */
  const accounts = profiles.filter(matches);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] pb-3">
        <div className="flex items-center gap-2.5">
          <User className="h-3.5 w-3.5 text-faint" strokeWidth={1.5} />
          <h3 className="text-[12px] font-medium tracking-[-0.01em] text-paper">
            Discovered accounts
          </h3>
          <span className="font-mono text-[10.5px] tabular-nums text-faint">
            {String(accounts.length).padStart(2, '0')}
            {category !== 'all' && (
              <span className="text-faint/60"> / {profiles.length}</span>
            )}
          </span>
        </div>

        {filterBar}
      </div>

      {accounts.length > 0 ? (
        <AnimatedGrid className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((card) => (
            <Item
              key={card.card_id || card.id}
              as="article"
              className="panel panel-hover flex flex-col justify-between p-4"
            >
              <div className="flex items-start gap-3">
                {card.avatar ? (
                  <img
                    src={card.avatar}
                    alt={card.name || card.handle}
                    className="h-9 w-9 shrink-0 rounded-lg border border-white/[0.1] object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] text-[11px] font-medium text-dim">
                    {(card.name || card.handle || '?')[0].toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-[12px] font-medium text-paper">
                      {card.name || card.handle || card.label || card.platform}
                    </h4>
                    <span className="label shrink-0 rounded-[4px] border border-white/[0.08] px-1.5 py-0.5 text-[8.5px] text-dim">
                      {card.label || card.platform}
                    </span>
                  </div>

                  {card.handle && (
                    <div className="mt-1 truncate font-mono text-[10.5px] text-faint">
                      {card.handle}
                    </div>
                  )}

                  {card.bio && (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-dim">
                      {card.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                <span className="font-mono text-[10px] tabular-nums text-faint">
                  {card.followers !== undefined
                    ? `${card.followers} followers`
                    : card.identity
                    ? 'source API'
                    : 'profile URL'}
                </span>

                {card.url && (
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link-accent text-[11px]"
                  >
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </Item>
          ))}
        </AnimatedGrid>
      ) : profiles.length === 0 ? (
        <div className="panel px-5 py-10 text-center">
          <p className="text-[12px] text-dim">
            No accounts matched this handle across the scanned endpoints.
          </p>
        </div>
      ) : (
        <EmptyCategory onClear={() => setCategory('all')} />
      )}
    </div>
  );
};
