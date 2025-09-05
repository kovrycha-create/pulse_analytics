import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

const DB_PATH = path.join('/tmp', 'data', 'db.json');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const UPSTASH_KEY = process.env.UPSTASH_REDIS_KEY || 'pulse:events';

const upstashClient = (UPSTASH_URL && UPSTASH_TOKEN) ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

async function upstashClear(key: string) {
  if (upstashClient) {
    // client.ltrim to empty list
    return await upstashClient.ltrim(key, 1, 0);
  }
  if (!UPSTASH_URL || !UPSTASH_TOKEN) throw new Error('upstash not configured');
  const url = `${UPSTASH_URL}/commands`;
  const body = { command: ['LTRIM', key, '1', '0'] };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '<no-body>');
    throw new Error('upstash ltrim failed ' + res.status + ' ' + txt);
  }
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS similar to other endpoints
  const requestOrigin = (req.headers.origin as string) || '';
  const allowOrigin = requestOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    let upstashResult: any = null;
    let fileRemoved = false;

    // Try clearing Upstash list if configured
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      try {
        upstashResult = await upstashClear(UPSTASH_KEY);
      } catch (e) {
        console.error('clear: upstash clear failed', e);
      }
    }

    // Remove fallback DB file if present
    try {
      await fs.unlink(DB_PATH);
      fileRemoved = true;
    } catch (e: any) {
      if (e && e.code === 'ENOENT') {
        fileRemoved = false;
      } else {
        console.error('clear: unlink failed', e);
      }
    }

    return res.status(200).json({ ok: true, upstash: !!upstashResult, fileRemoved });
  } catch (err) {
    console.error('clear: unexpected error', err);
    return res.status(500).json({ ok: false, message: (err && (err as Error).message) || 'Failed to clear data' });
  }
}
