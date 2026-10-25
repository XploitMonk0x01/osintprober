import React from 'react';
import { ArrowUpRight, Home, LifeBuoy, LogOut, Search, Users } from 'lucide-react';
import { DashboardUser } from '../types/dashboard.js';
import { Mark } from './ui/Mark.js';

interface DashboardSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  user: DashboardUser;
}

const NAV = [
  { label: 'Overview', path: '/', icon: Home },
  { label: 'Social reveal', path: '/dashboard/social-reveal', icon: Search },
  { label: 'Research tools', path: '/tools', icon: Users },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentPath,
  onNavigate,
  user,
}) => {
  const usagePercent = Math.min(
    100,
    Math.round((user.searchesUsed / Math.max(1, user.searchesTotal)) * 100)
  );
  const remaining = Math.max(0, user.searchesTotal - user.searchesUsed);

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[228px] shrink-0 flex-col justify-between border-r border-white/[0.07] px-4 py-5 md:flex">
      <div>
        {/* Brand */}
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="group flex items-center gap-2.5 rounded-lg px-1 py-1"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-white/[0.12] bg-white/[0.03] text-paper transition-colors duration-200 group-hover:border-accent/45 group-hover:text-accent">
            <Mark className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12.5px] font-medium tracking-[-0.015em] text-paper">
            osintprober
          </span>
        </button>

        {/* Navigation */}
        <nav aria-label="Dashboard" className="mt-8 space-y-0.5">
          {NAV.map(({ label, path, icon: Icon }) => {
            const active = currentPath === path;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(path)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-[11.5px] transition-colors duration-200 ${
                  active
                    ? 'bg-white/[0.045] text-paper'
                    : 'text-dim hover:bg-white/[0.025] hover:text-paper'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-3 w-px -translate-y-1/2 bg-accent" />
                )}
                <Icon
                  className={`h-3.5 w-3.5 ${active ? 'text-accent' : 'text-faint'}`}
                  strokeWidth={1.6}
                />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Quota */}
        <div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3">
          <div className="flex items-center justify-between">
            <span className="label">{user.plan} plan</span>
            <span className="font-mono text-[10px] tabular-nums text-dim">
              {user.searchesUsed}/{user.searchesTotal}
            </span>
          </div>

          <div className="mt-2.5 h-px w-full bg-white/10">
            <div
              className="h-px bg-accent transition-[width] duration-300"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <p className="mt-2.5 text-[10.5px] leading-relaxed text-faint">
            {remaining} searches left this week. Resets {user.resetDate}.
          </p>

          <p className="mt-2.5 font-mono text-[9.5px] leading-relaxed text-faint/80">
            Rolling 24h window. Allowance returns automatically.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-white/[0.07] pt-3">
        <p
          className="truncate px-1 font-mono text-[10px] text-faint"
          title={user.email ?? 'Local session'}
        >
          {user.email ?? 'local session'}
        </p>

        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="btn btn-quiet w-full justify-start px-1.5 text-[10.5px]"
        >
          <ArrowUpRight className="h-3 w-3 text-faint" />
          Back to site
        </button>

        <button
          type="button"
          onClick={() =>
            alert('OSINTprober adheres to public record intelligence and privacy opt-out frameworks.')
          }
          className="btn btn-quiet w-full justify-start px-1.5 text-[10.5px]"
        >
          <LifeBuoy className="h-3 w-3 text-faint" />
          Privacy choices
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="btn btn-quiet w-full justify-start px-1.5 text-[10.5px]"
        >
          <LogOut className="h-3 w-3 text-faint" />
          Sign out
        </button>
      </div>
    </aside>
  );
};
