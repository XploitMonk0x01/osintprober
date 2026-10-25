import dns from 'node:dns/promises';
import { PLATFORMS_CATALOG, type PlatformData } from './platforms.js';
import { probeEmail, probeUsername, type ProbeResult } from './probes.js';
import type { ProfileCard, PlatformOutcome } from '../src/types/osint.js';

export interface ScanCallbacks {
  onStart: (data: { mode: 'email' | 'username'; total_platforms: number }) => void;
  onStatus: (message: string) => void;
  onPlatform: (data: {
    id: string;
    label: string;
    found: boolean;
    outcome: PlatformOutcome;
    scanned: number;
    hits: number;
    failed: number;
    note?: string;
  }) => void;
  onProfile: (profile: ProfileCard) => void;
  onComplete: (data: {
    found: number;
    scanned: number;
    total_platforms: number;
    duration_ms: number;
    mailbox_domains: string[];
    unresolved: number;
  }) => void;
  onError: (error: { code: string; message: string }) => void;
}

export interface ScanItem {
  platform: PlatformData;
  result: ProbeResult;
}

export interface ScanCollect {
  items: ScanItem[];
  mailboxDomains: string[];
  scanned: number;
  hits: number;
  unresolved: number;
  durationMs: number;
}

const CONCURRENCY = 10;

/** Real DNS MX resolution for the mailbox host behind an email address. */
export async function resolveMailboxDomains(domain: string): Promise<string[]> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return [domain];

    const detected = new Set<string>();
    for (const record of mxRecords) {
      const exchange = record.exchange.toLowerCase();
      if (exchange.includes('google') || exchange.includes('googlemail')) {
        detected.add('google.com');
      } else if (exchange.includes('outlook') || exchange.includes('microsoft')) {
        detected.add('microsoft.com');
      } else if (exchange.includes('proton')) {
        detected.add('proton.me');
      } else if (exchange.includes('icloud') || exchange.includes('apple')) {
        detected.add('icloud.com');
      } else if (exchange.includes('zoho')) {
        detected.add('zoho.com');
      } else {
        const parts = exchange.split('.');
        if (parts.length >= 2) detected.add(parts.slice(-2).join('.'));
      }
    }
    return Array.from(detected).slice(0, 5);
  } catch {
    return [domain];
  }
}

export interface ScanHooks {
  onStatus?: (message: string) => void;
  onPlatform?: (data: {
    platform: PlatformData;
    result: ProbeResult;
    scanned: number;
    hits: number;
  }) => void;
  onProfile?: (platform: PlatformData, result: ProbeResult) => void;
}

/**
 * Probes every catalog source for the identifier, with a bounded worker pool.
 * Nothing is synthesised: each item is the outcome of one real network check.
 */
export async function runScan(
  query: string,
  mode: 'email' | 'username',
  hooks: ScanHooks = {},
  abortSignal?: AbortSignal
): Promise<ScanCollect> {
  const startedAt = Date.now();
  const platforms = PLATFORMS_CATALOG.filter(
    (p) => p.checkType === 'both' || p.checkType === mode
  );

  let mailboxDomains: string[] = [];
  if (mode === 'email') {
    const domain = query.split('@')[1];
    if (domain) {
      hooks.onStatus?.(`Resolving mail exchangers for ${domain}`);
      mailboxDomains = await resolveMailboxDomains(domain);
    }
  }

  const queue = [...platforms];
  const items: ScanItem[] = [];
  let scanned = 0;
  let hits = 0;
  let unresolved = 0;

  const worker = async () => {
    while (queue.length > 0) {
      if (abortSignal?.aborted) return;
      const platform = queue.shift();
      if (!platform) return;

      const result =
        mode === 'email'
          ? await probeEmail(platform, query)
          : await probeUsername(platform, query);

      if (abortSignal?.aborted) return;

      scanned += 1;
      if (result.verdict === 'hit') hits += 1;
      if (result.verdict === 'unresolved') unresolved += 1;
      items.push({ platform, result });

      hooks.onPlatform?.({ platform, result, scanned, hits });
      if (result.verdict === 'hit') hooks.onProfile?.(platform, result);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, platforms.length) }, () => worker())
  );

  return {
    items,
    mailboxDomains,
    scanned,
    hits,
    unresolved,
    durationMs: Date.now() - startedAt,
  };
}

export async function executeScan(
  query: string,
  mode: 'email' | 'username',
  callbacks: ScanCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const platforms = PLATFORMS_CATALOG.filter(
    (p) => p.checkType === 'both' || p.checkType === mode
  );

  callbacks.onStart({ mode, total_platforms: platforms.length });
  callbacks.onStatus(
    `Checking ${platforms.length} sources for this ${mode === 'email' ? 'address' : 'handle'}.`
  );

  let profileId = 1;

  try {
    const outcome = await runScan(
      query,
      mode,
      {
        onStatus: (message) => callbacks.onStatus(message),
        onPlatform: ({ platform, result, scanned, hits }) => {
          callbacks.onPlatform({
            id: platform.id,
            label: platform.label,
            found: result.verdict === 'hit',
            outcome:
              result.verdict === 'hit'
                ? 'hit'
                : result.verdict === 'miss'
                ? 'miss'
                : 'unverified',
            scanned,
            hits,
            failed: 0,
            note: result.evidence,
          });
        },
        onProfile: (platform, result) => {
          if (!result.profile) return;
          callbacks.onProfile({
            id: profileId++,
            card_id: `${platform.id}:${query}`,
            platform: platform.id,
            label: platform.label,
            ...result.profile,
          } as ProfileCard);
        },
      },
      abortSignal
    );

    if (abortSignal?.aborted) {
      callbacks.onStatus('Scan aborted by client.');
      return;
    }

    callbacks.onComplete({
      found: outcome.hits,
      scanned: outcome.scanned,
      total_platforms: platforms.length,
      duration_ms: outcome.durationMs,
      mailbox_domains: outcome.mailboxDomains,
      unresolved: outcome.unresolved,
    });
  } catch (err: any) {
    callbacks.onError({
      code: 'upstream',
      message: err?.message || 'Scanning pipeline encountered an unexpected error.',
    });
  }
}
