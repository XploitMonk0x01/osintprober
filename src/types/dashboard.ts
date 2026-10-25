export interface DashboardUser {
  email: string | null;
  plan: 'LOCAL' | 'FREE' | 'PRO' | 'ENTERPRISE';
  searchesUsed: number;
  searchesTotal: number;
  resetsIn: string;
  resetDate: string;
}

export interface DossierData {
  subject: string;
  /** Names exactly as returned by each source, with that source named. */
  names: { name: string; platform: string }[];
  handles: string[];
  userId?: string;
  profilePictures: {
    platform: string;
    label: string;
    url: string;
  }[];
  links: {
    platform: string;
    label: string;
    url: string;
  }[];
  linkedEmails: {
    email: string;
    viaPlatform: string;
  }[];
  platformsAgreeCount: number;
}

export interface SocialResultItem {
  id: string;
  platform: string;
  label: string;
  category: 'social' | 'developer' | 'productivity' | 'creative' | 'entertainment' | 'gaming' | 'education';
  status: 'found' | 'miss' | 'unchecked';
  badgeType:
    | 'REGISTRATION REPORTED'
    | 'SIGNUP AVAILABILITY'
    | 'PUBLIC EMAIL MATCH'
    | 'ACTIVE PROFILE'
    | 'URL VERIFIED';
  badgeColor?: string;
  userId?: string;
  /** Display name exactly as the source returned it. */
  name?: string;
  handle?: string;
  email?: string;
  profileUrl?: string;
  avatarUrl?: string;
  statusNote?: string;
  matchedEmail?: string;
  images?: string[];
}

export interface SocialScrapeResponse {
  subject: string;
  mode: 'email' | 'username' | 'phone';
  scanned: number;
  found: number;
  unchecked: number;
  totalEndpoints: number;
  dossier: DossierData;
  results: SocialResultItem[];
  breachesCount: number;
  crossSearchHandle?: string;
}
