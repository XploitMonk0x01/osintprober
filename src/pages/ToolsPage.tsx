import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PLATFORMS_CATALOG } from '../../server/platforms.js';

interface ToolsPageProps {
  onSelectTool: (route: string) => void;
}

const countByCheck = (type: 'email' | 'username' | 'both') =>
  PLATFORMS_CATALOG.filter((p) => p.checkType === type).length;

const TOOLS = [
  {
    id: 'reverse-email',
    index: '01',
    title: 'Reverse email lookup',
    desc: 'Resolve DNS mail exchangers, match the Gravatar hash, and surface public accounts that expose the address.',
    route: '/reverse-email-lookup',
    action: 'Open',
    meta: `${countByCheck('email') + countByCheck('both')} sources`,
  },
  {
    id: 'username-search',
    index: '02',
    title: 'Username enumerator',
    desc: 'Runs real HTTP and API checks across the catalog and reports each source as found, not found, or unverified.',
    route: '/',
    action: 'Open',
    meta: `${countByCheck('username') + countByCheck('both')} sources`,
  },
  {
    id: 'mailbox-resolver',
    index: '03',
    title: 'Mailbox MX & DNS resolver',
    desc: 'Resolve authoritative mail exchanges to identify the mail host behind a domain — Google, Microsoft, Proton, Zoho.',
    route: '/reverse-email-lookup',
    action: 'Inspect',
    meta: 'DNS',
  },
  {
    id: 'platforms-directory',
    index: '04',
    title: 'Endpoint catalog',
    desc: 'Every supported source, its category, and which identifier type it accepts.',
    route: '/platforms',
    action: 'Browse',
    meta: `${PLATFORMS_CATALOG.length} endpoints`,
  },
];

export const ToolsPage: React.FC<ToolsPageProps> = ({ onSelectTool }) => {
  return (
    <div>
      <header className="border-b border-white/[0.07] pb-8 pt-14 sm:pt-16">
        <span className="label">Research suite</span>
        <h1 className="mt-4 text-[1.85rem] font-medium leading-tight tracking-[-0.035em] text-paper sm:text-[2.15rem]">
          Four ways to investigate
        </h1>
        <p className="mt-2.5 max-w-xl text-[12.5px] leading-relaxed text-dim">
          Every module runs live checks against public sources and reports what each one
          actually returned.
        </p>
      </header>

      <div className="divide-y divide-white/[0.07]">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.route)}
            className="group grid w-full grid-cols-1 items-start gap-x-8 gap-y-3 py-7 text-left sm:grid-cols-[auto_1fr_auto]"
          >
            <span className="label pt-1 font-mono text-[9.5px] tracking-[0.14em]">
              {tool.index}
            </span>

            <div className="min-w-0">
              <h2 className="text-[14px] font-medium tracking-[-0.015em] text-paper transition-colors duration-200">
                {tool.title}
              </h2>
              <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-dim">
                {tool.desc}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <span className="font-mono text-[10px] text-faint">{tool.meta}</span>
              <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint transition-colors duration-200 group-hover:text-accent">
                {tool.action}
                <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
        <p className="text-[11px] text-faint">
          No fabricated results. Unverifiable sources are reported as unverified.
        </p>
        <span className="font-mono text-[10px] tabular-nums text-faint">
          {PLATFORMS_CATALOG.length} endpoints · real checks only
        </span>
      </div>
    </div>
  );
};
