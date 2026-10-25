import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Download,
  ExternalLink,
  LayoutGrid,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Table as TableIcon,
  User,
  X,
} from 'lucide-react';
import { DashboardUser, SocialScrapeResponse } from '../types/dashboard.js';
import { DossierCard } from '../components/DossierCard.js';
import { Mark } from '../components/ui/Mark.js';
import { EASE } from '../lib/motion.js';

interface SocialRevealPageProps {
  user: DashboardUser;
  onNavigateHome: () => void;
}

type LookupMode = 'email' | 'username';

const MODES: { id: LookupMode; label: string; icon: typeof User }[] = [
  { id: 'username', label: 'Username', icon: User },
  { id: 'email', label: 'Email', icon: Mail },
];

const GENRES = [
  'all',
  'social',
  'developer',
  'productivity',
  'entertainment',
  'gaming',
  'education',
];

const Metric: React.FC<{ label: string; value: React.ReactNode; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div>
    <div
      className={`font-mono text-[14px] tabular-nums leading-none ${
        accent ? 'text-accent' : 'text-paper'
      }`}
    >
      {value}
    </div>
    <div className="label mt-1.5 text-[8.5px]">{label}</div>
  </div>
);

const HISTORY_KEY = 'osintprober:history';

interface HistoryEntry {
  query: string;
  mode: LookupMode;
  found: number;
  at: number;
}

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toCsv = (data: SocialScrapeResponse) => {
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['platform', 'category', 'status', 'handle', 'profile_url', 'evidence'];
  const rows = data.results.map((r) =>
    [r.platform, r.category, r.status, r.handle ?? '', r.profileUrl ?? '', r.statusNote ?? '']
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
};

export const SocialRevealPage: React.FC<SocialRevealPageProps> = ({
  user,
  onNavigateHome,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<LookupMode>('username');
  const [data, setData] = useState<SocialScrapeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchFilter, setSearchFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'relevant' | 'name'>('relevant');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [usage, setUsage] = useState<DashboardUser>(user);

  useEffect(() => setHistory(readHistory()), []);
  useEffect(() => setUsage(user), [user]);

  const refreshUsage = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json?.user) setUsage(json.user);
    } catch {
      // The displayed allowance simply stays as-is.
    }
  };

  const executeSearch = async (
    targetQuery: string,
    targetMode: LookupMode = mode
  ) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/socialscrape/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery.trim(), mode: targetMode }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message || `Lookup failed (HTTP ${res.status}).`);
        return;
      }

      const result = json as SocialScrapeResponse;
      setData(result);

      const entry: HistoryEntry = {
        query: result.subject,
        mode: targetMode,
        found: result.found,
        at: Date.now(),
      };
      setHistory((previous) => {
        const next = [
          entry,
          ...previous.filter((h) => !(h.query === entry.query && h.mode === entry.mode)),
        ].slice(0, 8);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The lookup could not be completed.'
      );
    } finally {
      setLoading(false);
      void refreshUsage();
    }
  };

  const handleCrossSearch = (handle: string) => {
    setQuery(handle);
    setMode('username');
    executeSearch(handle, 'username');
  };

  const filteredResults = useMemo(() => {
    if (!data) return [];
    let items = [...data.results];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      items = items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.handle?.toLowerCase().includes(q) ||
          i.statusNote?.toLowerCase().includes(q)
      );
    }

    if (genreFilter !== 'all') {
      items = items.filter((i) => i.category === genreFilter);
    }

    if (sortBy === 'name') {
      items.sort((a, b) => a.label.localeCompare(b.label));
    }

    return items;
  }, [data, searchFilter, genreFilter, sortBy]);

  const exportName = `osintprober_${(data?.subject ?? query).replace(/[@.]/g, '_')}`;

  return (
    <div className="relative z-10 flex min-h-screen flex-1 flex-col">
      {/* Utility bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/[0.07] bg-ink/70 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="OSINTprober home"
            className="flex h-5 w-5 items-center justify-center text-faint transition-colors duration-200 hover:text-accent md:hidden"
          >
            <Mark className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="hidden text-faint sm:inline">dashboard</span>
            <span className="hidden text-faint/50 sm:inline">/</span>
            <span className="text-paper/90">live lookup</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 font-mono text-[10px] tabular-nums text-faint sm:flex">
            <span>
              <span className="text-paper">{usage.searchesUsed}</span> / {usage.searchesTotal}
              <span className="ml-1">in 24h</span>
            </span>
            <span className="text-faint/40">·</span>
            <span>resets in {usage.resetsIn}</span>
          </div>

          <button
            type="button"
            onClick={() => alert('No new notifications at this time.')}
            className="btn btn-quiet h-6 w-6 p-0"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-7 sm:px-8">
        {/* Subject */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="label">{data ? data.mode : mode}</span>
              <span className="h-px w-4 bg-white/15" />
              <span className="font-mono text-[10px] text-faint">
                {data?.totalEndpoints ?? 0} sources checked
              </span>
            </div>

            <h1
              className={`mt-3 max-w-lg truncate text-[1.55rem] font-medium leading-tight tracking-[-0.035em] sm:text-[1.8rem] ${
                data ? 'text-paper' : 'text-faint'
              }`}
              title={data?.subject ?? 'New lookup'}
            >
              {data?.subject ?? 'New lookup'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <Metric label="found" value={data?.found ?? 0} accent />
            <Metric label="checked" value={data?.scanned ?? 0} />
            <Metric label="unverified" value={data?.unchecked ?? 0} />
          </div>
        </div>

        {/* Controls */}
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px] transition-colors duration-200 ${
                  mode === id ? 'bg-white/[0.07] text-paper' : 'text-faint hover:text-dim'
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={1.6} />
                {label}
              </button>
            ))}
          </div>

          <span className="font-mono text-[10px] text-faint">
            every source is checked live
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/[0.09] bg-[#0a0c0e]/80 px-3 transition-colors duration-200 focus-within:border-accent/40">
            <Search className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.6} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch(query)}
              placeholder={mode === 'email' ? 'Enter an email address' : 'Enter a username handle'}
              aria-label="Search identifier"
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-paper placeholder:font-sans placeholder:text-faint focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => executeSearch(query)}
            disabled={loading || !query.trim()}
            className="btn btn-primary h-10 shrink-0 px-4"
          >
            {loading ? 'Probing' : 'Scan'}
            <ArrowRight className="h-3 w-3 opacity-40" />
          </button>
        </div>

        {loading && (
          <p className="mt-2.5 flex items-center gap-2 font-mono text-[10.5px] text-faint">
            <span
              className="h-1 w-1 rounded-full bg-accent"
              style={{ animation: 'pulse-soft 1.4s ease-in-out infinite' }}
            />
            running live checks — this takes a few seconds
          </p>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-rose-300/80" />
            <div className="flex-1">
              <p className="text-[11.5px] leading-relaxed text-rose-200/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss"
              className="btn btn-quiet h-5 w-5 p-0 text-rose-200/60"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="label mr-0.5">Recent</span>
            {history.map((entry) => (
              <button
                key={`${entry.mode}:${entry.query}`}
                type="button"
                onClick={() => {
                  setQuery(entry.query);
                  setMode(entry.mode);
                  executeSearch(entry.query, entry.mode);
                }}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-dim transition-colors duration-200 hover:border-white/[0.14] hover:text-paper"
              >
                {entry.query}
                <span className="text-faint/70">{entry.mode === 'email' ? 'mail' : 'handle'}</span>
              </button>
            ))}
          </div>
        )}

        {data?.crossSearchHandle && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCrossSearch(data.crossSearchHandle!)}
              className="link-accent text-[11px]"
            >
              <Sparkles className="h-3 w-3" strokeWidth={1.6} />
              Cross-search @{data.crossSearchHandle} as a username
            </button>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-faint">
              uses 1 lookup
            </span>
          </div>
        )}

        {/* Toolbar */}
        {data && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-md border border-white/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-label="Card view"
                  aria-pressed={viewMode === 'cards'}
                  className={`flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors duration-200 ${
                    viewMode === 'cards' ? 'bg-white/[0.07] text-paper' : 'text-faint hover:text-dim'
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                  className={`flex h-6 w-6 items-center justify-center rounded-[5px] transition-colors duration-200 ${
                    viewMode === 'table' ? 'bg-white/[0.07] text-paper' : 'text-faint hover:text-dim'
                  }`}
                >
                  <TableIcon className="h-3 w-3" strokeWidth={1.6} />
                </button>
              </div>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-faint"
                  strokeWidth={1.6}
                />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter"
                  aria-label="Filter results"
                  className="h-7 w-32 rounded-md border border-white/[0.08] bg-transparent pl-7 pr-2 text-[11px] text-paper placeholder:text-faint focus:border-accent/40 focus:outline-none"
                />
              </div>

              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                aria-label="Filter by category"
                className="h-7 cursor-pointer rounded-md border border-white/[0.08] bg-transparent px-1.5 font-mono text-[10.5px] text-dim focus:border-accent/40 focus:outline-none"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'all categories' : g}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevant' | 'name')}
                aria-label="Sort results"
                className="h-7 cursor-pointer rounded-md border border-white/[0.08] bg-transparent px-1.5 font-mono text-[10.5px] text-dim focus:border-accent/40 focus:outline-none"
              >
                <option value="relevant">relevant</option>
                <option value="name">a–z</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => executeSearch(data.subject, data.mode === 'phone' ? 'username' : data.mode)}
                aria-label="Re-scan"
                className="btn btn-quiet h-7 w-7 p-0"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={1.6} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!data) return;
                  downloadFile(toCsv(data), `${exportName}.csv`, 'text/csv;charset=utf-8');
                }}
                aria-label="Export CSV"
                className="btn btn-quiet h-7 px-1.5 font-mono text-[10px]"
              >
                CSV
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!data) return;
                  downloadFile(
                    JSON.stringify(data, null, 2),
                    `${exportName}.json`,
                    'application/json'
                  );
                }}
                aria-label="Export JSON"
                className="btn btn-quiet h-7 px-1.5 font-mono text-[10px]"
              >
                <Download className="h-3 w-3" strokeWidth={1.6} />
                JSON
              </button>
            </div>
          </div>
        )}

        {/* Dossier */}
        {data && data.found > 0 && (
          <div className="mt-5">
            <DossierCard
              dossier={data.dossier}
              onCrossSearch={handleCrossSearch}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
            />
          </div>
        )}

        {/* Results */}
        <div className="mt-5">
          {!data && !loading ? (
            <div className="panel px-5 py-12 text-center">
              <p className="text-[12px] text-dim">
                Enter a handle or address to run live checks.
              </p>
              <p className="mt-1.5 font-mono text-[10.5px] text-faint">
                Only sources with a public, verifiable check are reported.
              </p>
            </div>
          ) : data && filteredResults.length === 0 ? (
            <div className="panel px-5 py-10 text-center">
              <p className="text-[11.5px] text-dim">
                {data.found === 0
                  ? 'No source returned a match for this identifier.'
                  : 'No results match the current filters.'}
              </p>
              {data.found > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilter('');
                    setGenreFilter('all');
                  }}
                  className="link-accent mt-2 text-[11.5px]"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredResults.map((item) => (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="panel panel-hover flex flex-col justify-between p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-md border border-white/[0.1] object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] text-[10px] font-medium uppercase text-dim">
                              {item.label.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="truncate text-[12px] font-medium tracking-[-0.01em] text-paper">
                              {item.label}
                            </h3>
                            <span className="label mt-1 text-[8px]">{item.category}</span>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-[4px] border px-1.5 py-0.5 font-mono text-[8.5px] uppercase leading-[13px] tracking-[0.06em] ${
                            item.badgeColor || 'border-white/10 text-faint'
                          }`}
                        >
                          {item.badgeType === 'URL VERIFIED' ? 'URL VERIFIED' : item.badgeType}
                        </span>
                      </div>

                      <dl className="mt-3.5 space-y-1">
                        {item.name && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-[10px] text-faint">Name</dt>
                            <dd className="truncate text-[10.5px] text-dim">{item.name}</dd>
                          </div>
                        )}
                        {item.handle && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-[10px] text-faint">Handle</dt>
                            <dd className="truncate font-mono text-[10.5px] text-dim">
                              {item.handle}
                            </dd>
                          </div>
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-[10px] text-faint">Checked</dt>
                          <dd className="truncate font-mono text-[10.5px] text-faint">
                            {item.badgeType === 'ACTIVE PROFILE' ? 'source API' : 'profile URL'}
                          </dd>
                        </div>
                      </dl>

                      {item.statusNote && (
                        <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[10.5px] leading-relaxed text-faint">
                          {item.statusNote}
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
                      {item.avatarUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: item.avatarUrl!,
                              title: `${item.label} avatar`,
                            })
                          }
                          className="text-[10.5px] text-faint transition-colors duration-200 hover:text-paper"
                        >
                          View avatar
                        </button>
                      ) : (
                        <span />
                      )}

                      {item.profileUrl && (
                        <a
                          href={item.profileUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-accent text-[10.5px]"
                        >
                          Open source
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['Source', 'Category', 'Status', 'Evidence', ''].map((h, i) => (
                        <th
                          key={h || i}
                          className={`px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-faint ${
                            i === 4 ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filteredResults.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors duration-200 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2.5">
                          <span className="text-[11.5px] text-paper">{item.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[10.5px] capitalize text-faint">
                          {item.category}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-[4px] border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${
                              item.badgeColor || 'border-white/10 text-faint'
                            }`}
                          >
                            {item.badgeType}
                          </span>
                        </td>
                        <td className="max-w-[280px] truncate px-4 py-2.5 font-mono text-[10.5px] text-dim">
                          {item.statusNote}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {item.profileUrl && (
                            <a
                              href={item.profileUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="link-accent text-[10.5px]"
                            >
                              Open
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              className="panel w-full max-w-xs p-4"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[11.5px] text-paper">{previewImage.title}</h3>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  aria-label="Close"
                  className="btn btn-quiet h-6 w-6 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-[#060709] p-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="h-40 w-40 rounded-md object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
