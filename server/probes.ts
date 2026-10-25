import crypto from 'node:crypto';
import type { ProfileCard } from '../src/types/osint.js';
import type { PlatformData } from './platforms.js';

export type ProbeVerdict = 'hit' | 'miss' | 'unresolved';

export interface ProbeResult {
  verdict: ProbeVerdict;
  /** Public profile URL that was checked, when one exists. */
  url?: string;
  /** What the check actually observed. Surfaced as the card's status note. */
  evidence: string;
  /** Only real values returned by the source. Never synthesised. */
  profile?: Partial<Omit<ProfileCard, 'id' | 'card_id'>>;
}

const UA = 'OSINTprober/1.0 (public profile verification)';
const TIMEOUT_MS = 7000;

const JSON_HEADERS = { Accept: 'application/json', 'User-Agent': UA };
const HTML_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent': UA,
};

async function get(url: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS) {
  return fetch(url, {
    redirect: 'follow',
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': UA, ...(init.headers as Record<string, string> | undefined) },
  });
}

const miss = (evidence: string): ProbeResult => ({ verdict: 'miss', evidence });
const unresolved = (evidence: string): ProbeResult => ({ verdict: 'unresolved', evidence });

function failed(err: unknown): ProbeResult {
  const name = (err as { name?: string })?.name;
  if (name === 'TimeoutError' || name === 'AbortError') {
    return unresolved('Source did not respond in time');
  }
  return unresolved('Source could not be reached');
}

/* -------------------------------------------------------------------------- */
/*                            username-mode sources                            */
/* -------------------------------------------------------------------------- */

/**
 * Sources verified to answer 404 for a missing profile (probed with a
 * guaranteed-nonexistent handle). A 200 here is a real existence signal.
 */
const STATUS_CHECKED = new Set([
  'twitter',
  'youtube',
  'spotify',
  'soundcloud',
  'bandcamp',
  'vimeo',
  'dribbble',
  'behance',
  'goodreads',
  'pastebin',
  'patreon',
  'replit',
  'strava',
]);

/** Sources that answer with a generic page or block automated checks. */
const UNCHECKABLE: Record<string, string> = {
  discord: 'No public profile URL for this source',
  instagram: 'Source returns a generic page for missing profiles',
  tiktok: 'Source blocks automated checks',
  linkedin: 'Source returns a generic page for missing profiles',
  twitch: 'Source returns a generic page for missing profiles',
  pinterest: 'Source returns a generic page for missing profiles',
  medium: 'Source blocks automated checks (HTTP 403)',
  telegram: 'Source returns a generic page for missing profiles',
  imgur: 'Source returns a generic page for missing profiles',
  pypi: 'Source returns a generic page for missing profiles',
  reddit: 'Source blocks automated checks (HTTP 403)',
  leetcode: 'Source blocks automated checks (HTTP 403)',
  hackerrank: 'Source returns a generic page for missing profiles',
  duolingo: 'Source returns a generic page for missing profiles',
  archiveorg: 'Source returns a generic page for missing profiles',
  nexusmods: 'Source blocks automated checks (HTTP 403)',
  epicgames: 'No public profile URL for this source',
  ubisoft: 'No public profile URL for this source',
  myfitnesspal: 'Source blocks automated checks (HTTP 403)',
};

const EMAIL_ONLY = new Set([
  'adobe',
  'dropbox',
  'google_workspace',
  'microsoft_account',
  'apple_id',
  'notion',
  'slack',
  'figma',
  'atlassian',
  'canva',
  'zoom',
  'proton',
  'evernote',
  'lastpass',
  'bitwarden',
  'ea_origin',
]);

const chip = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean) as string[];

/* ------------------------------- JSON APIs -------------------------------- */

async function githubUser(username: string): Promise<ProbeResult> {
  const res = await get(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: JSON_HEADERS,
  });
  if (res.status === 404) return miss('GitHub API returned 404');
  if (!res.ok) return unresolved(`GitHub API returned HTTP ${res.status}`);
  const d: any = await res.json();
  return {
    verdict: 'hit',
    url: d.html_url,
    evidence: 'GitHub REST API returned this public account.',
    profile: {
      name: d.name || d.login,
      handle: d.login,
      bio: d.bio || undefined,
      avatar: d.avatar_url,
      followers: typeof d.followers === 'number' ? d.followers : undefined,
      url: d.html_url,
      identity: true,
      named: true,
      chips: chip(
        typeof d.public_repos === 'number' && `${d.public_repos} public repos`,
        d.company && `Company: ${d.company}`,
        d.location && `Location: ${d.location}`,
        d.blog && 'Linked website'
      ),
    },
  };
}

async function gitlabUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
    { headers: JSON_HEADERS }
  );
  if (res.status === 403 || res.status === 429)
    return unresolved(`GitLab API returned HTTP ${res.status}`);
  if (!res.ok) return unresolved(`GitLab API returned HTTP ${res.status}`);
  const users: any[] = await res.json();
  const user = Array.isArray(users) ? users[0] : null;
  if (!user) return miss('GitLab API returned no matching user');
  return {
    verdict: 'hit',
    url: user.web_url,
    evidence: 'GitLab API returned this public account.',
    profile: {
      name: user.name || user.username,
      handle: user.username,
      bio: user.bio || undefined,
      avatar: user.avatar_url,
      url: user.web_url,
      identity: true,
      named: true,
      chips: chip(user.organization && `Org: ${user.organization}`, user.location),
    },
  };
}

async function keybaseUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://keybase.io/_/api/1.0/user/lookup.json?username=${encodeURIComponent(username)}`,
    { headers: JSON_HEADERS }
  );
  if (!res.ok) return unresolved(`Keybase API returned HTTP ${res.status}`);
  const d: any = await res.json();
  const them = d?.them?.[0];
  if (!them?.basics?.username) {
    return d?.status?.desc === 'invalid name'
      ? miss('Keybase rejected the username as invalid')
      : miss('Keybase lookup returned no matching account');
  }
  const profile = them.profile || {};
  return {
    verdict: 'hit',
    url: `https://keybase.io/${them.basics.username}`,
    evidence: 'Keybase lookup API resolved this account.',
    profile: {
      name: profile.full_name || them.basics.username,
      handle: them.basics.username,
      bio: profile.bio || undefined,
      avatar: profile.profile_pic || undefined,
      url: `https://keybase.io/${them.basics.username}`,
      identity: true,
      named: true,
      chips: chip(profile.location, profile.website && 'Linked website'),
    },
  };
}

async function chessUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`,
    { headers: JSON_HEADERS }
  );
  if (res.status === 404) return miss('Chess.com API returned 404');
  if (!res.ok) return unresolved(`Chess.com API returned HTTP ${res.status}`);
  const d: any = await res.json();
  return {
    verdict: 'hit',
    url: `https://www.chess.com/member/${d.username}`,
    evidence: 'Chess.com public API returned this player.',
    profile: {
      name: d.name || d.username,
      handle: d.username,
      bio: d.status || undefined,
      avatar: d.avatar || undefined,
      followers: typeof d.followers === 'number' ? d.followers : undefined,
      url: `https://www.chess.com/member/${d.username}`,
      identity: true,
      named: true,
      chips: chip(
        d.title && `Title: ${d.title}`,
        d.country?.charAt?.(d.country.lastIndexOf('/') + 1) && `Country: ${d.country.split('/').pop()}`
      ),
    },
  };
}

async function lichessUser(username: string): Promise<ProbeResult> {
  const res = await get(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
    headers: JSON_HEADERS,
  });
  if (res.status === 404) return miss('Lichess API returned 404');
  if (!res.ok) return unresolved(`Lichess API returned HTTP ${res.status}`);
  const d: any = await res.json();
  const profile = d.profile || {};
  return {
    verdict: 'hit',
    url: `https://lichess.org/@/${d.username}`,
    evidence: 'Lichess public API returned this account.',
    profile: {
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || d.username,
      handle: d.username,
      bio: profile.bio || undefined,
      followers: typeof d.count?.followers === 'number' ? d.count.followers : undefined,
      url: `https://lichess.org/@/${d.username}`,
      identity: true,
      named: true,
      chips: chip(typeof d.count?.all === 'number' && `${d.count.all} games played`),
    },
  };
}

async function dockerUser(username: string): Promise<ProbeResult> {
  const res = await get(`https://hub.docker.com/v2/users/${encodeURIComponent(username)}/`, {
    headers: JSON_HEADERS,
  });
  if (res.status === 404) return miss('Docker Hub API returned 404');
  if (!res.ok) return unresolved(`Docker Hub API returned HTTP ${res.status}`);
  const d: any = await res.json();
  return {
    verdict: 'hit',
    url: `https://hub.docker.com/u/${d.username}`,
    evidence: 'Docker Hub API returned this account.',
    profile: {
      name: d.full_name || d.username,
      handle: d.username,
      bio: d.affiliation || undefined,
      avatar: d.gravatar_url || undefined,
      url: `https://hub.docker.com/u/${d.username}`,
      identity: true,
      named: true,
      chips: chip(d.company && `Company: ${d.company}`, d.location),
    },
  };
}

async function npmUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(
      `maintainer:${username}`
    )}&size=1`,
    { headers: JSON_HEADERS }
  );
  if (!res.ok) return unresolved(`npm registry returned HTTP ${res.status}`);
  const d: any = await res.json();
  if (!d?.total) return miss('npm registry lists no packages for this maintainer');
  return {
    verdict: 'hit',
    url: `https://www.npmjs.com/~${username}`,
    evidence: 'npm registry lists packages published by this username.',
    profile: {
      handle: username,
      url: `https://www.npmjs.com/~${username}`,
      identity: false,
      named: false,
      chips: chip(`${d.total} package listing${d.total === 1 ? '' : 's'}`),
    },
  };
}

async function steamUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://steamcommunity.com/id/${encodeURIComponent(username)}?xml=1`,
    { headers: { Accept: 'application/xml,text/xml', 'User-Agent': UA } }
  );
  if (!res.ok) return unresolved(`Steam returned HTTP ${res.status}`);
  const xml = await res.text();
  if (/<error>/.test(xml)) return miss('Steam XML profile lookup returned an error');
  const id = xml.match(/<steamID64>(\d+)<\/steamID64>/)?.[1];
  if (!id) return unresolved('Steam response could not be parsed');
  const persona = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/)?.[1];
  const avatar = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/)?.[1];
  const url = `https://steamcommunity.com/id/${username}`;
  return {
    verdict: 'hit',
    url,
    evidence: 'Steam XML profile endpoint returned this profile.',
    profile: {
      name: persona || username,
      handle: username,
      avatar,
      url,
      identity: true,
      named: Boolean(persona),
      chips: chip(`Steam ID ${id}`),
    },
  };
}

async function robloxUser(username: string): Promise<ProbeResult> {
  const res = await get('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!res.ok) return unresolved(`Roblox API returned HTTP ${res.status}`);
  const d: any = await res.json();
  const user = d?.data?.[0];
  if (!user) return miss('Roblox username API returned no account');
  return {
    verdict: 'hit',
    url: `https://www.roblox.com/users/${user.id}/profile`,
    evidence: 'Roblox username API resolved this account.',
    profile: {
      name: user.displayName || user.name,
      handle: user.name,
      url: `https://www.roblox.com/users/${user.id}/profile`,
      identity: true,
      named: Boolean(user.displayName),
      chips: chip(`User ID ${user.id}`),
    },
  };
}

async function mojangUser(username: string): Promise<ProbeResult> {
  const res = await get(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
    { headers: JSON_HEADERS }
  );
  if (res.status === 204 || res.status === 404 || res.status === 400)
    return miss('Mojang API returned no profile');
  if (!res.ok) return unresolved(`Mojang API returned HTTP ${res.status}`);
  const d: any = await res.json();
  if (!d?.id) return miss('Mojang API returned no profile');
  return {
    verdict: 'hit',
    evidence: 'Mojang API resolved this Minecraft account.',
    profile: {
      handle: d.name,
      avatar: `https://mc-heads.net/avatar/${d.id}/100`,
      identity: false,
      named: true,
      chips: chip(`UUID ${d.id}`),
    },
  };
}

/* ----------------------------- status probes ------------------------------ */

async function statusProbe(platform: PlatformData, username: string): Promise<ProbeResult> {
  const url = platform.urlPattern?.replace('%s', encodeURIComponent(username));
  if (!url) return unresolved('No public profile URL for this source');

  const res = await get(url, { headers: HTML_HEADERS });
  const status = res.status;
  await res.body?.cancel().catch(() => {});

  if (status === 404 || status === 410) return miss(`Source returned HTTP ${status}`);
  if (status === 403 || status === 429 || status === 451)
    return unresolved(`Source blocked the check (HTTP ${status})`);
  if (status >= 500 || status < 200 || status >= 400)
    return unresolved(`Source returned HTTP ${status}`);

  return {
    verdict: 'hit',
    url,
    evidence: `Profile URL resolves (HTTP ${status}); this source returns no public metadata.`,
    profile: {
      url,
      identity: false,
      named: false,
      chips: ['Profile URL resolves'],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                entry points                                */
/* -------------------------------------------------------------------------- */

export async function probeUsername(
  platform: PlatformData,
  username: string
): Promise<ProbeResult> {
  try {
    switch (platform.id) {
      case 'github':
        return await githubUser(username);
      case 'gitlab':
        return await gitlabUser(username);
      case 'keybase':
        return await keybaseUser(username);
      case 'chess_com':
        return await chessUser(username);
      case 'lichess':
        return await lichessUser(username);
      case 'dockerhub':
        return await dockerUser(username);
      case 'npm':
        return await npmUser(username);
      case 'steam':
        return await steamUser(username);
      case 'roblox':
        return await robloxUser(username);
      case 'minecraft':
        return await mojangUser(username);
      default:
        break;
    }

    if (STATUS_CHECKED.has(platform.id)) {
      return await statusProbe(platform, username);
    }

    const reason = UNCHECKABLE[platform.id];
    if (reason) return unresolved(reason);

    return unresolved('No reliable public check for this source');
  } catch (err) {
    return failed(err);
  }
}

export async function probeEmail(platform: PlatformData, email: string): Promise<ProbeResult> {
  const clean = email.trim().toLowerCase();

  try {
    if (platform.id === 'gravatar') {
      const hash = crypto.createHash('sha256').update(clean).digest('hex');
      const res = await get(`https://gravatar.com/${hash}.json`, { headers: JSON_HEADERS });
      if (res.status === 404) return miss('Gravatar has no profile for this address hash');
      if (!res.ok) return unresolved(`Gravatar returned HTTP ${res.status}`);
      const d: any = await res.json();
      const entry = d?.entry?.[0];
      if (!entry) return miss('Gravatar returned no profile for this address');
      return {
        verdict: 'hit',
        url: entry.profileUrl,
        evidence: 'Gravatar profile hash resolved for this address.',
        profile: {
          name: entry.displayName || entry.name?.formatted || undefined,
          handle: entry.preferredUsername || undefined,
          bio: entry.aboutMe || undefined,
          avatar: entry.thumbnailUrl || undefined,
          url: entry.profileUrl,
          identity: true,
          named: true,
          chips: chip('Gravatar hash match'),
        },
      };
    }

    if (platform.id === 'github') {
      const res = await get(
        `https://api.github.com/search/users?q=${encodeURIComponent(clean)}+in:email&per_page=1`,
        { headers: JSON_HEADERS }
      );
      if (res.status === 403 || res.status === 429)
        return unresolved(`GitHub search API returned HTTP ${res.status}`);
      if (!res.ok) return unresolved(`GitHub search API returned HTTP ${res.status}`);
      const d: any = await res.json();
      const user = d?.items?.[0];
      if (!user) return miss('No GitHub account exposes this email publicly');
      return {
        verdict: 'hit',
        url: user.html_url,
        evidence: 'GitHub user search matched this address on a public email field.',
        profile: {
          name: user.login,
          handle: user.login,
          avatar: user.avatar_url,
          url: user.html_url,
          identity: true,
          named: true,
          chips: chip('Public email match'),
        },
      };
    }

    if (EMAIL_ONLY.has(platform.id)) {
      return unresolved('No public registration check — requires an authenticated provider');
    }

    return unresolved('Email lookup needs a recovered handle for this source');
  } catch (err) {
    return failed(err);
  }
}
