import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

const DB_PATH = path.join('/tmp', 'data', 'db.json');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const UPSTASH_KEY = process.env.UPSTASH_REDIS_KEY || 'pulse:events';

const upstashClient = (UPSTASH_URL && UPSTASH_TOKEN) ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

async function tryParseEntry(e: any, i: number) {
  if (!e) return null;
  if (typeof e === 'object') return e;
  if (typeof e === 'string') {
    try { return JSON.parse(e); } catch (err) {
      console.error('upstash-health: JSON.parse failed for sample index=', i, 'err=', err, 'raw=', e);
      return { raw: e };
    }
  }
  try { return JSON.parse(String(e)); } catch (err) { return { raw: String(e) }; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  const result: any = {
    upstashConfigured: Boolean(UPSTASH_URL && UPSTASH_TOKEN),
    upstashReadOk: false,
    upstashEntriesCount: null,
    upstashSample: [],
    fallbackFileExists: false,
    fallbackEntriesCount: null,
    fallbackSample: []
  };

  // Inspect Upstash if configured
  if (upstashClient) {
    try {
      // Try to read a small sample and the length
      let sampleRaw: any = [];
      try {
        // read first few entries (0..4)
        sampleRaw = await upstashClient.lrange(UPSTASH_KEY, 0, 4);
      } catch (e) {
        console.error('upstash-health: lrange failed', e);
      }

      // try to get length
      try {
        const llen = await upstashClient.llen(UPSTASH_KEY);
        result.upstashEntriesCount = Number(llen) || 0;
      } catch (e) {
        console.error('upstash-health: llen failed', e);
      }

      if (Array.isArray(sampleRaw) && sampleRaw.length) {
        result.upstashSample = await Promise.all(sampleRaw.map((s: any, i: number) => tryParseEntry(s, i)));
        result.upstashReadOk = true;
      } else if (sampleRaw && Array.isArray((sampleRaw as any).result)) {
        // REST /commands returned { result: [...] }
        const r = (sampleRaw as any).result;
        result.upstashSample = await Promise.all(r.map((s: any, i: number) => tryParseEntry(s, i)));
        result.upstashReadOk = true;
        if (result.upstashEntriesCount === null) result.upstashEntriesCount = r.length;
      }
    } catch (err) {
      console.error('upstash-health: unexpected error', err);
    }
  }

  // Inspect fallback /tmp DB
  try {
    const stat = await fs.stat(DB_PATH);
    result.fallbackFileExists = true;
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        result.fallbackEntriesCount = arr.length;
        result.fallbackSample = arr.slice(-5).map((a: any, i: number) => a);
      }
    } catch (e) {
      console.error('upstash-health: parse fallback DB failed', e);
    }
    result.fallbackFileSize = stat.size;
  } catch (e: any) {
    if (e && e.code === 'ENOENT') {
      result.fallbackFileExists = false;
    } else {
      console.error('upstash-health: stat/read error', e);
    }
  }

  console.log('upstash-health: report', JSON.stringify(result));
  return res.status(200).json(result);
}
