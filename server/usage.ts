import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';

// Kept outside the project tree: a file written here must never trigger a
// dev-server reload in the middle of a scan.
const DATA_DIR = path.join(os.tmpdir(), 'osintprober');
const FILE = path.join(DATA_DIR, 'usage.json');
const WINDOW_MS = 24 * 60 * 60 * 1000;
const LIMIT = Math.max(1, Number(process.env.SCAN_LIMIT ?? 25));

type Store = Record<string, { scans: number[] }>;

function readStore(): Store {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(store));
  } catch {
    // Usage persistence is best-effort; the scan itself must not fail because of it.
  }
}

const activeScans = (list: number[] = []) =>
  list.filter((t) => Number.isFinite(t) && t > Date.now() - WINDOW_MS).sort();

const formatDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatResetDate = (timestamp: number) =>
  new Date(timestamp)
    .toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '')
    .toUpperCase();

export interface Usage {
  used: number;
  total: number;
  remaining: number;
  resetsIn: string;
  resetDate: string;
}

export function ensureSession(req: Request, res: Response): string {
  const cookies = (req.headers.cookie ?? '').split(';').map((c) => c.trim());
  const existing = cookies
    .find((c) => c.startsWith('op_sid='))
    ?.slice('op_sid='.length);

  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;

  const id = crypto.randomUUID();
  res.cookie('op_sid', id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return id;
}

export function getUsage(sessionId: string): Usage {
  const scans = activeScans(readStore()[sessionId]?.scans ?? []);
  const used = scans.length;
  const remaining = Math.max(0, LIMIT - used);
  const expiry = used > 0 ? scans[0] + WINDOW_MS : Date.now() + WINDOW_MS;

  return {
    used,
    total: LIMIT,
    remaining,
    resetsIn: formatDuration(expiry - Date.now()),
    resetDate: formatResetDate(expiry),
  };
}

export function recordScan(sessionId: string) {
  const store = readStore();
  const scans = activeScans(store[sessionId]?.scans ?? []);
  scans.push(Date.now());
  store[sessionId] = { scans };
  writeStore(store);
}
