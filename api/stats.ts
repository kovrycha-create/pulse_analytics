import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
// Avoid importing TypeScript-only modules at runtime inside serverless functions.
// Use a local type alias for runtime compatibility.
type PageView = any;

// Use the same DB path as track
const DB_PATH = path.join('/tmp', 'data', 'db.json');

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
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const pageViews: PageView[] = JSON.parse(data);

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