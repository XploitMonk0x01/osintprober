import React from 'react';
import { motion } from 'motion/react';
import { EASE } from '../../lib/motion.js';

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

interface CategoryFilterProps {
  /** Unique namespace for the sliding active pill. */
  id: string;
  options: CategoryOption[];
  total: number;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Mono category chips with counts and a pill that slides between the active
 * options. Shared by the scan results and the platform index.
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  id,
  options,
  total,
  value,
  onChange,
  className,
}) => {
  const all = [{ value: 'all', label: 'all', count: total }, ...options];

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className={`-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 py-0.5 ${
        className ?? ''
      }`}
    >
      {all.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`relative shrink-0 rounded-md px-2 py-1.5 font-mono text-[10.5px] capitalize transition-colors duration-200 ${
              active ? 'text-paper' : 'text-faint hover:text-dim'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`${id}-category-pill`}
                className="absolute inset-0 rounded-md border border-white/[0.09] bg-white/[0.05]"
                transition={{ duration: 0.28, ease: EASE }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              <span
                className={`tabular-nums ${
                  active ? 'text-faint' : 'text-faint/60'
                }`}
              >
                {option.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
