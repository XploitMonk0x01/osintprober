import type {
  SocialScrapeResponse,
  SocialResultItem,
  DossierData,
} from '../src/types/dashboard.js';
import { runScan } from './osintEngine.js';

export type LookupMode = 'email' | 'username' | 'phone';

/** Thrown when a lookup type has no real public data source wired in. */
export class ProviderUnavailableError extends Error {
  code = 'provider_unavailable';
  constructor(message: string) {
    super(message);
  }
}

const CATEGORY_MAP: Record<string, SocialResultItem['category']> = {
  social: 'social',
  developer: 'developer',
  gaming: 'gaming',
  media: 'entertainment',
  productivity: 'productivity',
  crypto: 'productivity',
  misc: 'social',
};

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

/**
 * Runs the same real probes as the main scanner and maps only what the sources
 * actually returned into the dashboard shape.
 */
export async function executeSocialScrape(
  target: string,
  mode: LookupMode
): Promise<SocialScrapeResponse> {
  const clean = target.trim();

  if (mode === 'phone') {
    throw new ProviderUnavailableError(
      'Phone lookup needs a data provider (carrier or contact-graph API). No public source is wired into this build, so no phone results are fabricated.'
    );
  }

  const scan = await runScan(clean, mode);
  const hits = scan.items.filter(({ result }) => result.verdict === 'hit');

  const results: SocialResultItem[] = hits
    .map(({ platform, result }, index) => {
      const profile = result.profile ?? {};
      const url = result.url ?? profile.url;
      const isEmailMatch = mode === 'email' && platform.id === 'github';

      return {
        id: `${platform.id}-${index}`,
        platform: platform.id,
        label: platform.label,
        category: CATEGORY_MAP[platform.category] ?? 'social',
        status: 'found' as const,
        badgeType: isEmailMatch
          ? ('PUBLIC EMAIL MATCH' as const)
          : profile.identity
          ? ('ACTIVE PROFILE' as const)
          : ('URL VERIFIED' as const),
        badgeColor: profile.identity
          ? 'text-accent border-accent/25 bg-accent/[0.07]'
          : 'text-dim border-white/10 bg-white/[0.03]',
        name: profile.name,
        handle: profile.handle
          ? profile.handle.startsWith('@')
            ? profile.handle
            : `@${profile.handle}`
          : undefined,
        profileUrl: url,
        avatarUrl: profile.avatar,
        statusNote: result.evidence,
        images: profile.avatar ? [profile.avatar] : undefined,
      };
    })
    .sort((a, b) => (a.badgeType === 'ACTIVE PROFILE' ? -1 : 1) - (b.badgeType === 'ACTIVE PROFILE' ? -1 : 1));

  const handles = unique(
    hits
      .map(({ result }) => result.profile?.handle)
      .filter((h): h is string => Boolean(h))
  );
  const names = hits
    .map(({ platform, result }) =>
      result.profile?.name ? { name: result.profile.name, platform: platform.label } : null
    )
    .filter((n): n is { name: string; platform: string } => Boolean(n))
    .filter(
      (entry, index, list) =>
        list.findIndex((other) => other.name === entry.name && other.platform === entry.platform) ===
        index
    );
  const links = hits
    .map(({ platform, result }) => {
      const url = result.url ?? result.profile?.url;
      return url ? { platform: platform.id, label: platform.label, url } : null;
    })
    .filter((l): l is { platform: string; label: string; url: string } => Boolean(l));

  const profilePictures = unique(
    hits
      .map(({ platform, result }) =>
        result.profile?.avatar
          ? { platform: platform.id, label: platform.label, url: result.profile.avatar }
          : null
      )
      .filter((p): p is { platform: string; label: string; url: string } => Boolean(p))
  );

  const dossier: DossierData = {
    subject: clean,
    names,
    handles,
    profilePictures: profilePictures.slice(0, 6),
    links: links.slice(0, 8),
    linkedEmails: [],
    platformsAgreeCount: hits.length,
  };

  return {
    subject: clean,
    mode,
    scanned: scan.scanned,
    found: hits.length,
    unchecked: scan.unresolved,
    totalEndpoints: scan.scanned + scan.unresolved,
    dossier,
    results,
    breachesCount: 0,
    crossSearchHandle: handles[0],
  };
}
