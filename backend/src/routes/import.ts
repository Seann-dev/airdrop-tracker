import { Router } from 'express';
import dns from 'node:dns/promises';
import net from 'node:net';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000; // 1.5 MB

function isBlockedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  // Block loopback, private, link-local, multicast, unspecified, CGNAT, metadata
  const blocked: Array<[string, number]> = [
    ['127.0.0.0', 8],
    ['10.0.0.0', 8],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['169.254.0.0', 16], // includes 169.254.169.254 cloud metadata
    ['0.0.0.0', 8],
    ['100.64.0.0', 10],
    ['224.0.0.0', 4],
  ];
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // block IPv6/unparseable for safety
  const num = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  for (const [base, bits] of blocked) {
    const b = base.split('.').map(Number);
    const baseNum = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    if ((num & mask) === (baseNum & mask)) return true;
  }
  return false;
}

async function resolveAndCheck(hostname: string): Promise<void> {
  const lowered = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(lowered)) {
    throw new Error('Blocked host');
  }
  let addresses: string[];
  try {
    addresses = await dns.resolve4(hostname);
  } catch {
    throw new Error('DNS resolution failed');
  }
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new Error('Blocked IP range');
  }
}

async function fetchWithGuards(startUrl: string): Promise<{ finalUrl: string; html: string }> {
  let url = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http(s) allowed');
    await resolveAndCheck(parsed.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(url, {
        signal: ctrl.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'AirdropTracker/1.0 (+personal tracker)' },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(resp.status)) {
      const loc = resp.headers.get('location');
      if (!loc) throw new Error('Redirect without location');
      url = new URL(loc, url).toString();
      continue;
    }
    if (!resp.ok) throw new Error(`Fetch failed with status ${resp.status}`);

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content type: ${contentType.split(';')[0]}`);
    }

    // Size-limited read (no JS execution — plain text parse only)
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('Empty response body');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        reader.cancel();
        throw new Error('Response too large');
      }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks).toString('utf-8');
    return { finalUrl: url, html };
  }
  throw new Error('Too many redirects');
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000);
}

function extractDraft(html: string, url: string) {
  const title =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]?.trim() ||
    /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ||
    '';
  const description =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]?.trim() ||
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]?.trim() ||
    '';
  const text = extractText(html);

  // Only capture explicitly stated deadlines — never guess
  const deadlinePatterns = [
    /(?:deadline|ends?|closes?|snapshot)[^.\n]{0,60}?(\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
  ];
  let deadline: string | null = null;
  for (const re of deadlinePatterns) {
    const m = re.exec(text);
    if (m) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2032) {
        deadline = d.toISOString();
        break;
      }
    }
  }

  // Explicit task-like lines only (numbered/bulleted lists mentioning actions)
  const tasks: Array<{ id: string; title: string; done: boolean }> = [];
  const lines = text.split(/(?:\r?\n|;)/);
  let n = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 8 || t.length > 160) continue;
    if (!/(?:complete|join|follow|connect|bridge|swap|stake|claim|mint|visit|retweet|sign|verify)/i.test(t)) continue;
    if (/^(?:deadline|ends?)\b/i.test(t)) continue;
    tasks.push({ id: `draft-${++n}`, title: t, done: false });
    if (n >= 15) break;
  }

  return {
    projectName: title || new URL(url).hostname.replace(/^www\./, ''),
    description,
    officialLink: url,
    deadline, // null when not found — UI must show "not found, verify manually"
    tasks,
    foundDeadline: deadline !== null,
    foundTasks: tasks.length > 0,
    sourceAttribution: `Extracted from ${url}. Verify all details on the official page — this is not a legitimacy endorsement.`,
  };
}

const draftSchema = z.object({
  url: z.string().url('Must be a valid URL').refine(
    (v) => /^https?:\/\//i.test(v),
    'Only http(s) URLs are allowed'
  ),
});

// POST /api/airdrops/draft — fetch a project page, return editable draft (not saved)
router.post('/draft', async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid URL', details: parsed.error.flatten() });
    return;
  }
  try {
    const { finalUrl, html } = await fetchWithGuards(parsed.data.url);
    const draft = extractDraft(html, finalUrl);
    res.json(draft);
  } catch (err: any) {
    res.status(422).json({
      error: 'Could not extract from this URL',
      detail: err?.message || 'Fetch failed',
      fallback: 'You can enter the details manually instead.',
    });
  }
});

export default router;
