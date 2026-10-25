import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { EASE, SPRING } from '../lib/motion.js';
import { Mark } from './ui/Mark.js';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  endpointCount?: number;
}

const NAV_ITEMS = [
  { label: 'Scanner', route: '/' },
  { label: 'Reverse email', route: '/reverse-email-lookup' },
  { label: 'Platforms', route: '/platforms' },
  { label: 'Tools', route: '/tools' },
];

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  endpointCount = 60,
}) => {
  const [open, setOpen] = useState(false);
  const isDashboard = currentRoute.startsWith('/dashboard');

  // The mobile sheet should never survive a route change.
  useEffect(() => setOpen(false), [currentRoute]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="group -ml-1 flex shrink-0 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2"
          aria-label="OSINTprober home"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-white/[0.12] bg-white/[0.03] text-paper transition-colors duration-200 group-hover:border-accent/45 group-hover:text-accent">
            <Mark className="h-4 w-4" />
          </span>
          <span className="text-[13.5px] font-medium tracking-[-0.015em] text-paper">
            osintprober
          </span>
          <span className="hidden rounded-[4px] border border-white/10 px-1 font-mono text-[9px] leading-[15px] tracking-[0.08em] text-faint sm:inline">
            v2
          </span>
        </button>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center md:flex">
          {NAV_ITEMS.map((item) => {
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className="relative rounded-md px-3 py-2 text-[12.5px] tracking-[-0.01em] transition-colors duration-200"
              >
                <span
                  className={
                    active ? 'text-paper' : 'text-dim hover:text-paper'
                  }
                >
                  {item.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2.5 -bottom-[15px] h-px bg-accent"
                    transition={SPRING}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className="dot"
              style={{ animation: 'pulse-soft 3.2s ease-in-out infinite' }}
            />
            <span className="font-mono text-[11px] tabular-nums text-dim">
              {endpointCount}
              <span className="ml-1 text-faint">endpoints</span>
            </span>
          </div>

          <span className="hidden h-4 w-px bg-white/10 sm:block" />

          <button
            type="button"
            onClick={() => onNavigate('/dashboard/social-reveal')}
            className={`btn group hidden md:inline-flex ${
              isDashboard ? 'btn-ghost border-accent/30' : 'btn-quiet'
            }`}
          >
            <span className="px-0.5">Social reveal</span>
            <ArrowUpRight className="h-3 w-3 text-faint transition-all duration-200 group-hover:text-paper" />
          </button>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="btn btn-quiet -mr-1.5 px-2 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden border-t border-white/[0.07] bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
              <nav aria-label="Mobile" className="flex flex-col">
                {NAV_ITEMS.map((item, i) => {
                  const active = currentRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => onNavigate(item.route)}
                      className="group flex items-center justify-between border-b border-white/[0.06] py-3 text-left last:border-b-0"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="font-mono text-[10px] text-faint">
                          0{i + 1}
                        </span>
                        <span
                          className={`text-[13px] ${
                            active ? 'text-paper' : 'text-dim group-hover:text-paper'
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                      {active && <span className="dot" />}
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center justify-between py-3.5">
                <span className="flex items-center gap-2">
                  <span className="dot" />
                  <span className="font-mono text-[11px] text-dim">
                    {endpointCount}
                    <span className="ml-1 text-faint">endpoints</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard/social-reveal')}
                  className="link-accent text-[12px]"
                >
                  Social reveal
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
