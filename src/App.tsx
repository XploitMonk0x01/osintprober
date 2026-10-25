import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, AlertCircle, RefreshCw, Shield, Sparkles, Terminal } from 'lucide-react';
import { Header } from './components/Header.js';
import { SearchBar } from './components/SearchBar.js';
import { ScannerGrid } from './components/ScannerGrid.js';
import { ResultsView } from './components/ResultsView.js';
import { ReverseEmailPage } from './pages/ReverseEmailPage.js';
import { PlatformsPage } from './pages/PlatformsPage.js';
import { ToolsPage } from './pages/ToolsPage.js';
import { DashboardSidebar } from './components/DashboardSidebar.js';
import { SocialRevealPage } from './pages/SocialRevealPage.js';
import { DashboardUser } from './types/dashboard.js';
import { useOsintScanner } from './hooks/useOsintScanner.js';
import { BackgroundTemplate } from './components/BackgroundTemplate.js';
import { PLATFORMS_CATALOG } from '../server/platforms.js';
import { Reveal } from './components/ui/Reveal.js';
import { startSmoothScroll, scrollToTop } from './lib/lenis.js';
import { EASE } from './lib/motion.js';

const PREFILL_KEY = 'osintprober:demo:prefill';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname && window.location.pathname !== '/'
      ? window.location.pathname
      : '/';
  });
  const [user, setUser] = useState<DashboardUser>({
    email: null,
    plan: 'LOCAL',
    searchesUsed: 0,
    searchesTotal: 0,
    resetsIn: '—',
    resetDate: '—',
  });
  const { state, startScan, reset } = useOsintScanner();

  // Smooth scrolling, shared across the whole shell.
  useEffect(() => startSmoothScroll(), []);

  // Load the real session allowance, and refresh it whenever the route changes.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});
  }, [currentRoute]);

  // Listen for browser popstate
  useEffect(() => {
    const onPop = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Check for prefilled email from sessionStorage
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem(PREFILL_KEY);
      if (prefill) {
        sessionStorage.removeItem(PREFILL_KEY);
        handleNavigate('/');
        startScan(prefill, 'email');
      }
    } catch {}
  }, [startScan]);

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    if (window.location.pathname !== route) {
      window.history.pushState(null, '', route);
    }
    scrollToTop();
  };

  const handleSearchEmailFromPage = (email: string) => {
    try {
      sessionStorage.setItem(PREFILL_KEY, email);
    } catch {}
    handleNavigate('/');
    startScan(email, 'email');
  };

  const isScanningOrDone = state.phase !== 'idle';

  // Render Authenticated Dashboard Shell
  if (currentRoute.startsWith('/dashboard')) {
    return (
      <div className="relative flex min-h-screen font-sans text-paper">
        <BackgroundTemplate variant="dashboard" />
        <DashboardSidebar
          currentPath={currentRoute}
          onNavigate={handleNavigate}
          user={user}
        />
        <SocialRevealPage user={user} onNavigateHome={() => handleNavigate('/')} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col font-sans text-paper">
      <BackgroundTemplate variant="default" />

      <Header
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        endpointCount={PLATFORMS_CATALOG.length}
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        {currentRoute === '/reverse-email-lookup' && (
          <ReverseEmailPage onSearchEmail={handleSearchEmailFromPage} />
        )}

        {currentRoute === '/platforms' && <PlatformsPage />}

        {currentRoute === '/tools' && <ToolsPage onSelectTool={handleNavigate} />}

        {currentRoute === '/' && (
          <div>
            {/* Hero */}
            <section className="mx-auto max-w-2xl pt-16 text-center sm:pt-24">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="flex items-center justify-center gap-2"
              >
                <span
                  className="dot"
                  style={{ animation: 'pulse-soft 3.2s ease-in-out infinite' }}
                />
                <span className="label">
                  {PLATFORMS_CATALOG.length} endpoints · live
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.06, ease: EASE }}
                className="mt-7 text-balance text-[2.3rem] font-medium leading-[1.05] tracking-[-0.05em] text-paper sm:text-[3.55rem]"
              >
                One query across
                <br className="hidden sm:block" /> every public endpoint
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
                className="mx-auto mt-5 max-w-md text-pretty text-[13px] leading-relaxed text-dim sm:text-[13.5px]"
              >
                Probe public profiles, developer footprints, and the sources that
                expose an email address or username handle.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.18, ease: EASE }}
                className="mt-9"
              >
                <SearchBar
                  initialQuery={state.query}
                  onSearch={(q) => startScan(q)}
                  phase={state.phase}
                />

                {state.message && (state.phase === 'hint' || state.phase === 'error') && (
                  <div className="mx-auto mt-4 flex max-w-xl items-start gap-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-left">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-rose-300/80" />
                    <span className="text-[11.5px] leading-relaxed text-rose-200/70">
                      {state.message}
                    </span>
                  </div>
                )}
              </motion.div>
            </section>

            {/* Active pipeline */}
            {isScanningOrDone && (
              <Reveal className="mt-16" y={10}>
                <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-[13px] font-medium tracking-[-0.01em] text-paper">
                      Active probe
                    </h2>
                    <span className="label">pipeline</span>
                  </div>

                  {state.phase === 'done' && (
                    <button type="button" onClick={reset} className="btn btn-quiet">
                      <RefreshCw className="h-3 w-3" />
                      New scan
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <ScannerGrid state={state} />
                  <ResultsView state={state} />
                </div>
              </Reveal>
            )}

            {/* Idle: three quiet capability columns */}
            {!isScanningOrDone && (
              <Reveal className="mt-24 sm:mt-32" delay={0.1}>
                <div className="grid gap-px overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
                  {[
                    {
                      index: '01',
                      icon: Shield,
                      title: 'Mailbox & identity checks',
                      body: 'Resolves DNS mail exchangers for the address, then checks Gravatar hashes and GitHub for public identities.',
                    },
                    {
                      index: '02',
                      icon: Sparkles,
                      title: 'Handle enumeration',
                      body: `Runs real HTTP and API checks across ${PLATFORMS_CATALOG.length} public sources and returns only what each source exposes.`,
                    },
                    {
                      index: '03',
                      icon: Terminal,
                      title: 'Live SSE streaming',
                      body: 'Streams findings incrementally as each endpoint responds, without ever blocking your session.',
                    },
                  ].map(({ index, icon: Icon, title, body }) => (
                    <div
                      key={index}
                      className="group bg-[#08090b] px-6 py-7 transition-colors duration-300 hover:bg-[#0b0c0e]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="label">{index}</span>
                        <Icon
                          className="h-3.5 w-3.5 text-faint transition-colors duration-300 group-hover:text-accent"
                          strokeWidth={1.5}
                        />
                      </div>
                      <h3 className="mt-7 text-[13px] font-medium tracking-[-0.01em] text-paper">
                        {title}
                      </h3>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-dim">{body}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 px-1">
                  <p className="text-[11.5px] leading-relaxed text-faint">
                    Public records only. No authenticated sources are touched.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/tools')}
                    className="link-accent text-[11.5px]"
                  >
                    Explore the research suite
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </Reveal>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-24 border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-md text-[11px] leading-relaxed text-faint">
            OSINTprober is an open-source intelligence research interface querying
            public endpoints and standard protocols.
          </p>

          <div className="flex items-center gap-4 font-mono text-[10.5px] tabular-nums text-faint">
            <span>© {new Date().getFullYear()} OSINTprober</span>
            <span className="h-3 w-px bg-white/10" />
            <span>local workspace</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
