import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { PLATFORMS_CATALOG } from '../../server/platforms.js';
import { CategoryFilter, type CategoryOption } from '../components/ui/CategoryFilter.js';
import { EASE } from '../lib/motion.js';

const CATEGORIES = ['social', 'developer', 'gaming', 'media', 'productivity', 'crypto'];

const CATEGORY_OPTIONS: CategoryOption[] = CATEGORIES.map((value) => ({
  value,
  label: value,
  count: PLATFORMS_CATALOG.filter((p) => p.category === value).length,
}));

export const PlatformsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = PLATFORMS_CATALOG.filter((p) => {
    const matchesSearch =
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <header className="border-b border-white/[0.07] pb-8 pt-14 sm:pt-16">
        <span className="label">Directory</span>
        <h1 className="mt-4 text-[1.85rem] font-medium leading-tight tracking-[-0.035em] text-paper sm:text-[2.15rem]">
          Supported targets
        </h1>
        <p className="mt-2.5 max-w-xl text-[12.5px] leading-relaxed text-dim">
          <span className="font-mono text-paper">{PLATFORMS_CATALOG.length}</span> sources in
          the catalog. Each scan reports a source as found, not found, or unverified —
          never guessed.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-white/[0.07] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[260px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-faint"
            strokeWidth={1.6}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter platforms"
            aria-label="Filter platforms"
            className="field h-8 pl-7 pr-2.5 text-[11.5px]"
          />
        </div>

        <CategoryFilter
          id="platforms"
          options={CATEGORY_OPTIONS}
          total={PLATFORMS_CATALOG.length}
          value={selectedCategory}
          onChange={setSelectedCategory}
          className="sm:justify-end"
        />
      </div>

      {/* Index */}
      {filtered.length > 0 ? (
        <div className="relative mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((platform) => (
              <motion.div
                key={platform.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="group flex items-center justify-between gap-3 bg-[#08090b] px-4 py-3 transition-colors duration-200 hover:bg-[#0b0c0e]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] text-paper">{platform.label}</div>
                  <div className="label mt-1 text-[8.5px]">{platform.category}</div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em]">
                  {(platform.checkType === 'email' || platform.checkType === 'both') && (
                    <span className="rounded border border-accent/25 px-1 py-px text-accent">
                      email
                    </span>
                  )}
                  {(platform.checkType === 'username' || platform.checkType === 'both') && (
                    <span className="rounded border border-white/10 px-1 py-px text-faint">
                      handle
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="panel mt-5 px-5 py-12 text-center">
          <p className="text-[12px] text-dim">No endpoints match that filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
            className="link-accent mt-2 text-[11.5px]"
          >
            Clear filters
          </button>
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] tabular-nums text-faint">
        showing {filtered.length} of {PLATFORMS_CATALOG.length}
      </p>
    </div>
  );
};
