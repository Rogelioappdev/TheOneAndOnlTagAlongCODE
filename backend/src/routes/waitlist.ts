import { Hono } from 'hono';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const waitlistRouter = new Hono();

const DATA_DIR = join(process.cwd(), 'data');
const TOKENS_FILE = join(DATA_DIR, 'waitlist-tokens.json');

function loadTokens(): string[] {
  if (!existsSync(TOKENS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(TOKENS_FILE, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

function saveTokens(tokens: string[]): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify([...new Set(tokens)], null, 2));
}

// Register a push token for the waitlist
waitlistRouter.post('/register', async (c) => {
  let body: { token?: string };
  try {
    body = await c.req.json<{ token?: string }>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return c.json({ error: 'token is required' }, 400);
  }

  const tokens = loadTokens();
  if (!tokens.includes(token)) {
    tokens.push(token);
    saveTokens(tokens);
  }

  console.log(`[Waitlist] Token registered. Total on waitlist: ${tokens.length}`);
  return c.json({ success: true, count: tokens.length });
});

// Send "TagAlong is live!" notification to all waitlist users
// Call this endpoint when you go live to notify everyone
waitlistRouter.post('/notify', async (c) => {
  const tokens = loadTokens();

  if (tokens.length === 0) {
    return c.json({ success: true, sent: 0, message: 'No tokens on waitlist' });
  }

  // Expo push API accepts up to 100 per batch
  const BATCH_SIZE = 100;
  let sent = 0;
  let errors = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE).map(token => ({
      to: token,
      title: 'TagAlong is live! ✈️',
      body: "The wait is over. Come find your travel crew.",
      sound: 'default',
      data: { type: 'launch' },
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json() as { data: Array<{ status: string }> };
      const batchSent = result.data?.filter((r) => r.status === 'ok').length ?? 0;
      sent += batchSent;
      errors += batch.length - batchSent;
    } catch (err) {
      console.error('[Waitlist] Batch send failed:', err);
      errors += batch.length;
    }
  }

  console.log(`[Waitlist] Launch notifications sent: ${sent} ok, ${errors} errors`);
  return c.json({ success: true, sent, errors, total: tokens.length });
});

// Get waitlist count
waitlistRouter.get('/count', (c) => {
  const tokens = loadTokens();
  return c.json({ count: tokens.length });
});

export { waitlistRouter };
