import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
// Avoid importing TypeScript-only modules at runtime inside serverless functions.
// Use a local type alias for runtime compatibility.
type PageView = any;

// Use the same DB path as track
const DB_PATH = path.join('/tmp', 'data', 'db.json');

// Upstash config
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
const UPSTASH_KEY = process.env.UPSTASH_REDIS_KEY || 'pulse:events';

// Create an Upstash client when env is configured. The official client handles
// compatibility differences and avoids issuing disabled commands like COMMANDS.
const upstashClient = (UPSTASH_URL && UPSTASH_TOKEN) ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

async function upstashLrange(key: string, start = 0, stop = -1) {
  if (upstashClient) {
    // client.lrange returns an array directly
    return await upstashClient.lrange(key, start, stop);
  }

  if (!UPSTASH_URL || !UPSTASH_TOKEN) throw new Error('upstash not configured');
  const url = `${UPSTASH_URL}/commands`;
  const body = { command: ['LRANGE', key, String(start), String(stop)] };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '<no-body>');
    throw new Error('upstash lrange failed ' + res.status + ' ' + txt);
  }
  return res.json();
}

function aggregate(pageViews: PageView[]) {
  // Group by sessionId then split into sub-sessions by inactivity window
  const bySid: Record<string, PageView[]> = {};
  for (const v of pageViews) {
    const sid = v.sessionId || 'unknown';
    bySid[sid] = bySid[sid] || [];
    bySid[sid].push(v);
  }

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const sessions: Array<{
    id: string;
    sessionIdBase: string;
    start: string;
    end: string;
    durationSeconds: number;
    pages: string[];
    entryPage: string;
    exitPage: string;
    isBounce: boolean;
    views: PageView[];
  }> = [];

  for (const [sid, views] of Object.entries(bySid)) {
    // sort views by timestamp
    const sorted = views.slice().sort((a, b) => {
      const ta = Date.parse(a.timestamp as string) || 0;
      const tb = Date.parse(b.timestamp as string) || 0;
      return ta - tb;
    });

    // split by inactivity
    let bucket: PageView[] = [];
    let bucketIndex = 0;
    let lastTs = 0;

    for (const v of sorted) {
      const t = Date.parse(v.timestamp as string) || 0;
      if (!bucket.length) {
        bucket.push(v);
        lastTs = t;
        continue;
      }
      if (t - lastTs > SESSION_TIMEOUT) {
        // flush bucket
        const s = buildSession(sid, bucket, bucketIndex);
        sessions.push(s);
        bucketIndex += 1;
        bucket = [v];
      } else {
        bucket.push(v);
      }
      lastTs = t;
    }
    if (bucket.length) {
      const s = buildSession(sid, bucket, bucketIndex);
      sessions.push(s);
    }
  }

  const totalViews = pageViews.length;
  const totalSessions = sessions.length;
  const pagesPerSession = totalSessions ? sessions.reduce((acc, s) => acc + s.pages.length, 0) / totalSessions : 0;
  const bounces = sessions.filter(s => s.isBounce).length;
  const bounceRate = totalSessions ? (bounces / totalSessions) * 100 : 0;

  return {
    totalViews,
    totalSessions,
    pagesPerSession: Number(pagesPerSession.toFixed(2)),
    bounceRate: Number(bounceRate.toFixed(2)),
    sessions
  };
}

function buildSession(baseId: string, views: PageView[], index: number) {
  const sorted = views.slice().sort((a, b) => (Date.parse(a.timestamp as string) || 0) - (Date.parse(b.timestamp as string) || 0));
  const startTs = Date.parse(sorted[0].timestamp as string) || 0;
  const endTs = Date.parse(sorted[sorted.length - 1].timestamp as string) || 0;
  const duration = Math.max(0, Math.round((endTs - startTs) / 1000));

  const pages = sorted.map(v => v.page || '').filter(Boolean);
  const uniquePages: string[] = [];
  for (const p of pages) if (!uniquePages.length || uniquePages[uniquePages.length - 1] !== p) uniquePages.push(p);

  return {
    id: `${baseId}:${index}`,
    sessionIdBase: baseId,
    start: new Date(startTs).toISOString(),
    end: new Date(endTs || startTs).toISOString(),
    durationSeconds: duration,
    pages: uniquePages,
    entryPage: uniquePages[0] || '',
    exitPage: uniquePages[uniquePages.length - 1] || '',
    isBounce: sorted.length <= 1,
    views: sorted
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('Stats request origin=', req.headers.origin || '', 'query=', req.query);
    let pageViews: PageView[] = [];

    // Try Upstash first
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      try {
        const up = await upstashLrange(UPSTASH_KEY, 0, -1);

        // Diagnostic: log low-volume info for Vercel logs
        console.log('Stats: upstashLrange returned type=', Object.prototype.toString.call(up));

        // up could be an array (client.lrange) or an object { result: [...] } (REST /commands)
        let entries: string[] = [];
        if (Array.isArray(up)) {
          entries = up as string[];
          console.log('Stats: using Upstash client result, entries count=', entries.length);
        } else if (up && Array.isArray((up as any).result)) {
          entries = (up as any).result as string[];
          console.log('Stats: using Upstash REST result, entries count=', entries.length);
        } else {
          console.log('Stats: Upstash returned unexpected shape, falling back', up && typeof up);
        }

        if (entries && entries.length) {
          // entries may be JSON strings (what track writes) or already-parsed objects
          pageViews = entries.map((s: any, i: number) => {
            if (!s) return null;
            if (typeof s === 'string') {
              try { return JSON.parse(s); } catch (e) {
                console.error('Stats: JSON.parse failed for entry index=', i, 'error=', e, 'raw=', s);
                return null;
              }
            }
            if (typeof s === 'object') return s;
            try { return JSON.parse(String(s)); } catch (e) {
              console.error('Stats: Unexpected entry type, index=', i, 'type=', typeof s);
              return null;
            }
          }).filter(Boolean);
        }

        console.log('Stats: read from Upstash final entries=', pageViews.length);
      } catch (upErr) {
        console.error('Stats: Upstash read failed, falling back to /tmp', upErr);
      }
    }

    // Fallback to /tmp if Upstash had no data
    if (!pageViews || !pageViews.length) {
      let data: string;
      try {
        data = await fs.readFile(DB_PATH, 'utf-8');
      } catch (readErr: any) {
        if (readErr && readErr.code === 'ENOENT') {
          console.log('Stats: DB file not found at', DB_PATH);
          if (req.query.aggregate === 'true') {
            return res.status(200).json({ totalViews: 0, totalSessions: 0, pagesPerSession: 0, bounceRate: 0 });
          }
          return res.status(200).json([]);
        }
        console.error('Stats: error reading DB file', readErr);
        return res.status(500).json({ message: 'Failed to retrieve stats' });
      }

      try {
        pageViews = JSON.parse(data);
      } catch (parseErr) {
        console.error('Stats: JSON parse error for DB file, will return empty dataset', parseErr);
        if (req.query.aggregate === 'true') {
          return res.status(200).json({ totalViews: 0, totalSessions: 0, pagesPerSession: 0, bounceRate: 0 });
        }
        return res.status(200).json([]);
      }

      try {
        const stat = await fs.stat(DB_PATH);
        console.log('Stats: DB file size=', stat.size, 'entries=', Array.isArray(pageViews) ? pageViews.length : 'unknown');
        if (Array.isArray(pageViews) && pageViews.length) {
          const last = pageViews[pageViews.length - 1];
          console.log('Stats: last event ts=', last && last.timestamp, 'page=', last && last.page);
        }
      } catch (statErr) {
        // ignore stat failures
      }
    }

    // support ?aggregate=true
    if (req.query.aggregate === 'true') {
      return res.status(200).json(aggregate(pageViews));
    }

    return res.status(200).json(pageViews);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist => empty dataset
      if (req.query.aggregate === 'true') {
        return res.status(200).json({ totalViews: 0, totalSessions: 0, pagesPerSession: 0, bounceRate: 0 });
      }
      return res.status(200).json([]);
    }
    console.error('Error reading stats:', error);
    return res.status(500).json({ message: 'Failed to retrieve stats' });
  }
}