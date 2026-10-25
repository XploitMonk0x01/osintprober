import express from 'express';
import cors from 'cors';
import { PLATFORMS_CATALOG } from './platforms.js';
import { executeScan } from './osintEngine.js';
import { executeSocialScrape, ProviderUnavailableError, type LookupMode } from './socialScrape.js';
import { ensureSession, getUsage, recordScan } from './usage.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const countByCheck = (type: 'email' | 'username' | 'both') =>
  PLATFORMS_CATALOG.filter((p) => p.checkType === type).length;

app.get('/api/site-settings', (_req, res) => {
  res.json({
    total_platforms: PLATFORMS_CATALOG.length,
    username_platforms: countByCheck('username') + countByCheck('both'),
    email_platforms: countByCheck('email') + countByCheck('both'),
    status: 'online',
    version: '1.0.0',
    maintenance: false,
  });
});

/** Session identity and the real rolling 24h scan allowance for it. */
app.get('/api/auth/me', (req, res) => {
  const sessionId = ensureSession(req, res);
  const usage = getUsage(sessionId);

  res.json({
    authenticated: false,
    user: {
      email: null,
      plan: 'LOCAL',
      searchesUsed: usage.used,
      searchesTotal: usage.total,
      resetsIn: usage.resetsIn,
      resetDate: usage.resetDate,
    },
  });
});

/** Live scan stream. Every event comes from a real outbound check. */
app.post('/api/scan/stream', async (req, res) => {
  const { query, username } = req.body ?? {};
  const target = String(query || username || '').trim();

  if (!target) {
    return res.status(400).json({
      code: 'invalid_input',
      message: 'Please provide a username handle or email address.',
    });
  }

  const sessionId = ensureSession(req, res);
  const usage = getUsage(sessionId);
  if (usage.remaining <= 0) {
    return res.status(429).json({
      code: 'quota',
      message: `Daily limit of ${usage.total} scans reached. Resets in ${usage.resetsIn}.`,
    });
  }

  const isEmail = target.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  const mode: 'email' | 'username' = isEmail ? 'email' : 'username';

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  recordScan(sessionId);

  const sendEvent = (event: object) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) abortController.abort();
  });

  await executeScan(
    target,
    mode,
    {
      onStart: (data) => {
        sendEvent({
          type: 'start',
          mode: data.mode,
          total_platforms: data.total_platforms,
          remaining: usage.remaining - 1,
          attempts: usage.total,
          window_hours: 24,
        });
      },
      onStatus: (message) => sendEvent({ type: 'status', message }),
      onPlatform: (data) => {
        sendEvent({
          type: 'platform',
          id: data.id,
          label: data.label,
          found: data.found,
          outcome: data.outcome,
          scanned: data.scanned,
          hits: data.hits,
          failed: data.failed,
          note: data.note,
        });
      },
      onProfile: (profile) => sendEvent({ type: 'profile', profile }),
      onComplete: (data) => {
        sendEvent({
          type: 'complete',
          found: data.found,
          scanned: data.scanned,
          total_platforms: data.total_platforms,
          duration_ms: data.duration_ms,
          mailbox_domains: data.mailbox_domains,
          unresolved: data.unresolved,
          partial: false,
        });
        res.end();
      },
      onError: (err) => {
        sendEvent({ type: 'error', code: err.code, message: err.message });
        res.end();
      },
    },
    abortController.signal
  );
});

/** Dashboard lookup. Runs the same real probes and returns the mapped result set. */
app.post('/api/socialscrape/scrape', async (req, res) => {
  const { query, handle, mode } = req.body ?? {};
  const target = String(query || handle || '').trim();

  if (!target) {
    return res.status(400).json({ error: 'Target query or handle required' });
  }

  const lookupMode: LookupMode =
    mode === 'email' || mode === 'phone' || mode === 'username'
      ? mode
      : target.includes('@')
      ? 'email'
      : 'username';

  const sessionId = ensureSession(req, res);
  const usage = getUsage(sessionId);
  if (usage.remaining <= 0) {
    return res.status(429).json({
      code: 'quota',
      message: `Daily limit of ${usage.total} scans reached. Resets in ${usage.resetsIn}.`,
    });
  }

  if (lookupMode === 'phone') {
    return res.status(501).json({
      code: 'provider_unavailable',
      message:
        'Phone lookup needs a carrier or contact-graph provider. No public source is wired into this build.',
    });
  }

  recordScan(sessionId);

  try {
    const result = await executeSocialScrape(target, lookupMode);
    res.json(result);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      return res.status(501).json({ code: err.code, message: err.message });
    }
    console.error('[socialscrape]', err);
    res.status(500).json({
      code: 'upstream',
      message: 'The lookup could not be completed. Try again in a moment.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[OSINTprober] server on http://localhost:${PORT}`);
});
