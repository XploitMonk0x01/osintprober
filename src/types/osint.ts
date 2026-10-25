export type ScanPhase =
  | 'idle'
  | 'connecting'
  | 'verifying'
  | 'scanning'
  | 'waiting'
  | 'limited'
  | 'hint'
  | 'done'
  | 'error';

export type ScanMode = 'username' | 'email';

export type PlatformOutcome =
  | 'hit'
  | 'miss'
  /** The source answered, but its response cannot confirm or deny the profile. */
  | 'unverified'
  | 'rate_limited'
  | 'timeout'
  | 'interrupted'
  | 'error';

export interface ProfileCard {
  id: number;
  card_id?: string;
  platform: string;
  label?: string;
  name?: string;
  handle?: string;
  url?: string;
  avatar?: string;
  bio?: string;
  identity?: boolean;
  named?: boolean;
  restricted?: boolean;
  recovery_email_hint?: string;
  recovery_phone_hint?: string;
  chips?: string[];
  followers?: number;
  verified?: boolean;
  category?: string;
}

export interface EmailSplitResults {
  identities: ProfileCard[];
  signals: ProfileCard[];
  registered: ProfileCard[];
  unlisted: number;
  restricted: number;
}

export interface PlatformDefinition {
  id: string;
  label: string;
  category: string;
  accent: string;
  urlPattern?: string;
}

export interface ScannerState {
  phase: ScanPhase;
  mode: ScanMode;
  query: string;
  cells: Record<string, 'hit' | 'miss' | 'unresolved' | 'pending'>;
  /** Why a source landed on unresolved, straight from the probe. */
  cellNotes: Record<string, string>;
  timings: Record<string, number>;
  emailCells: { id: string; label?: string }[];
  profiles: ProfileCard[];
  scanned: number;
  hits: number;
  total: number;
  durationMs: number | null;
  partial: boolean;
  failed: number;
  missing: number;
  message: string;
  code: string | null;
  mailboxDomains: string[];
  remaining: number | null;
  attempts: number;
  windowHours: number;
  queueAhead: number | null;
}

export interface SseStartEvent {
  type: 'start';
  mode: ScanMode;
  total_platforms: number;
  remaining?: number;
  attempts?: number;
  window_hours?: number;
  masked?: boolean;
}

export interface SseStatusEvent {
  type: 'status';
  message: string;
  position?: number;
}

export interface SsePlatformEvent {
  type: 'platform';
  id: string;
  label: string;
  found: boolean;
  outcome: PlatformOutcome;
  scanned?: number;
  hits?: number;
  failed?: number;
  note?: string;
}

export interface SseProfileEvent {
  type: 'profile';
  profile: ProfileCard;
}

export interface SseCompleteEvent {
  type: 'complete';
  found: number;
  scanned: number;
  total_platforms: number;
  duration_ms: number;
  mailbox_domains?: string[];
  partial?: boolean;
  unresolved?: number;
}

export interface SseErrorEvent {
  type: 'error';
  code: string;
  message: string;
  retry_after?: number;
}

export type SseEvent =
  | SseStartEvent
  | SseStatusEvent
  | SsePlatformEvent
  | SseProfileEvent
  | SseCompleteEvent
  | SseErrorEvent;
