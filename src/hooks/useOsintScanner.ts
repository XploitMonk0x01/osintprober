import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ScannerState,
  ScanMode,
  SseEvent,
  EmailSplitResults,
  ProfileCard,
} from '../types/osint.js';

const STORAGE_PREFIX = 'osintprober:v1:';

const initialState: ScannerState = {
  phase: 'idle',
  mode: 'username',
  query: '',
  cells: {},
  cellNotes: {},
  timings: {},
  emailCells: [],
  profiles: [],
  scanned: 0,
  hits: 0,
  total: 0,
  durationMs: null,
  partial: false,
  failed: 0,
  missing: 0,
  message: '',
  code: null,
  mailboxDomains: [],
  remaining: null,
  attempts: 0,
  windowHours: 24,
  queueAhead: null,
};

export function classifyQuery(input: string): { kind: 'email' | 'username' | 'phone' | 'invalid' | 'empty'; q: string } {
  const clean = input.trim();
  if (!clean) return { kind: 'empty', q: '' };

  const cleanNoAt = clean.replace(/^@/, '');
  // Email check
  if (cleanNoAt.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(cleanNoAt) && cleanNoAt.length <= 254) {
      return { kind: 'email', q: cleanNoAt.toLowerCase() };
    }
    return { kind: 'invalid', q: cleanNoAt };
  }

  // Phone check
  const digitsOnly = clean.replace(/\D/g, '');
  if (/^\+?[\d\s().-]+$/.test(clean) && /[+\s().-]/.test(clean) && digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return { kind: 'phone', q: `+${digitsOnly}` };
  }

  // Username check
  const usernameClean = clean.replace(/^@/, '').replace(/[/?#].*$/, '');
  if (/^[a-zA-Z0-9_\-\.]{1,64}$/.test(usernameClean)) {
    return { kind: 'username', q: usernameClean };
  }

  return { kind: 'invalid', q: clean };
}

export function splitEmailResults(profiles: ProfileCard[]): EmailSplitResults {
  const res: EmailSplitResults = {
    identities: [],
    signals: [],
    registered: [],
    unlisted: 0,
    restricted: 0,
  };
  const seenBrands = new Set<string>();

  for (const prof of profiles) {
    if (prof.restricted) {
      res.restricted += 1;
      continue;
    }
    // High-confidence Identity profile
    if (prof.identity) {
      res.identities.push(prof);
      continue;
    }
    // Account signals (only produced when a source returns recovery hints)
    if (prof.recovery_email_hint || prof.recovery_phone_hint) {
      res.signals.push(prof);
      continue;
    }
    // Plain registered account badge
    const brand = (prof.label || prof.platform).toLowerCase();
    if (!seenBrands.has(brand)) {
      seenBrands.add(brand);
      res.registered.push(prof);
    }
  }

  return res;
}

export function useOsintScanner() {
  const [state, setState] = useState<ScannerState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  const startScan = useCallback(async (rawQuery: string, forcedMode?: ScanMode) => {
    const classification = classifyQuery(rawQuery);
    if (classification.kind === 'empty') return;
    if (classification.kind === 'invalid') {
      setState(s => ({
        ...s,
        phase: 'hint',
        message: 'Invalid search format. Enter a valid email address or username.',
      }));
      return;
    }
    if (classification.kind === 'phone') {
      setState(s => ({
        ...s,
        phase: 'hint',
        message:
          'Phone lookup needs a carrier or contact-graph provider. No public source is wired in, so no phone results are produced.',
      }));
      return;
    }

    const query = classification.q;
    const mode = forcedMode || (classification.kind === 'email' ? 'email' : 'username');

    // Check session cache first
    try {
      const cached = sessionStorage.getItem(`${STORAGE_PREFIX}${mode}:${query}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setState({
          ...parsed,
          phase: 'done',
        });
        return;
      }
    } catch {
      // Ignore sessionStorage error
    }

    // Cancel any running scan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    startTimeRef.current = performance.now();

    setState({
      ...initialState,
      phase: 'connecting',
      mode,
      query,
      message: `Connecting to ${mode} scan pipeline...`,
    });

    try {
      const resp = await fetch('/api/scan/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ query }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        let errData: any = {};
        try {
          errData = await resp.json();
        } catch {}
        setState(s => ({
          ...s,
          phase: 'error',
          code: errData.code || 'upstream',
          message: errData.message || 'Server error starting the scan.',
        }));
        return;
      }

      if (!resp.body) {
        setState(s => ({
          ...s,
          phase: 'error',
          code: 'no_stream',
          message: 'Readable stream unavailable from server.',
        }));
        return;
      }

      setState(s => ({ ...s, phase: 'scanning', message: '' }));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleEvent = (event: SseEvent) => {
        switch (event.type) {
          case 'start':
            setState(s => ({
              ...s,
              total: event.total_platforms,
              remaining: event.remaining ?? s.remaining,
              attempts: event.attempts ?? s.attempts,
              windowHours: event.window_hours ?? s.windowHours,
            }));
            break;

          case 'status':
            setState(s => ({
              ...s,
              message: event.message,
              queueAhead: event.position ?? null,
            }));
            break;

          case 'platform': {
            const timing = performance.now() - startTimeRef.current;
            setState(s => {
              const outcomeState: 'hit' | 'miss' | 'unresolved' =
                event.outcome === 'hit'
                  ? 'hit'
                  : event.outcome === 'miss'
                  ? 'miss'
                  : 'unresolved';

              const newCells = { ...s.cells, [event.id]: outcomeState };
              const newNotes = event.note
                ? { ...s.cellNotes, [event.id]: event.note }
                : s.cellNotes;
              const newTimings = { ...s.timings, [event.id]: timing };
              const existsInEmailCells = s.emailCells.some(c => c.id === event.id);
              const newEmailCells =
                s.mode === 'email' && !existsInEmailCells
                  ? [...s.emailCells, { id: event.id, label: event.label }]
                  : s.emailCells;

              return {
                ...s,
                phase: 'scanning',
                cells: newCells,
                cellNotes: newNotes,
                timings: newTimings,
                emailCells: newEmailCells,
                scanned: event.scanned ?? s.scanned + 1,
                hits: event.hits ?? s.hits + (event.found ? 1 : 0),
                failed: s.failed + (event.outcome === 'error' ? 1 : 0),
              };
            });
            break;
          }

          case 'profile':
            setState(s => {
              const cardId = event.profile.card_id;
              const existingIdx = cardId ? s.profiles.findIndex(p => p.card_id === cardId) : -1;
              if (existingIdx >= 0) {
                const updated = [...s.profiles];
                updated[existingIdx] = { ...event.profile, id: s.profiles[existingIdx].id };
                return { ...s, profiles: updated };
              }
              return {
                ...s,
                profiles: [...s.profiles, event.profile],
              };
            });
            break;

          case 'complete':
            setState(s => {
              const completedState: ScannerState = {
                ...s,
                phase: 'done',
                hits: event.found,
                scanned: event.scanned,
                total: event.total_platforms,
                durationMs: event.duration_ms,
                mailboxDomains: event.mailbox_domains || [],
                partial: !!event.partial,
                message: '',
              };
              // Save to sessionStorage
              try {
                sessionStorage.setItem(
                  `${STORAGE_PREFIX}${s.mode}:${s.query}`,
                  JSON.stringify(completedState)
                );
              } catch {}
              return completedState;
            });
            break;

          case 'error':
            setState(s => ({
              ...s,
              phase: 'error',
              code: event.code,
              message: event.message,
            }));
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const block of parts) {
          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const eventData = JSON.parse(line.slice(5).trim());
                handleEvent(eventData);
              } catch (err) {
                console.error('Failed to parse SSE event:', err, line);
              }
            }
          }
        }
      }

      if (buffer.startsWith('data:')) {
        try {
          const eventData = JSON.parse(buffer.slice(5).trim());
          handleEvent(eventData);
        } catch {}
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted
        return;
      }
      setState(s => ({
        ...s,
        phase: 'error',
        message: err?.message || 'Network stream failed.',
      }));
    }
  }, []);

  return {
    state,
    startScan,
    reset,
  };
}
