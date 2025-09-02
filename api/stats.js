import { promises as fs } from 'fs';
import path from 'path';

const DB_PATH = path.join('/tmp', 'data', 'db.json');

function buildSession(baseId, views, index) {
  const sorted = views.slice().sort((a, b) => (Date.parse(a.timestamp || '') || 0) - (Date.parse(b.timestamp || '') || 0));
  const startTs = Date.parse(sorted[0].timestamp || '') || 0;
  const endTs = Date.parse(sorted[sorted.length - 1].timestamp || '') || 0;
  const duration = Math.max(0, Math.round((endTs - startTs) / 1000));

  const pages = sorted.map(v => v.page || '').filter(Boolean);
  const uniquePages = [];
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

function aggregate(pageViews) {
  const bySid = {};
  for (const v of pageViews) {
    const sid = v.sessionId || 'unknown';
    bySid[sid] = bySid[sid] || [];
    bySid[sid].push(v);
  }

  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const sessions = [];

  for (const [sid, views] of Object.entries(bySid)) {
    const sorted = views.slice().sort((a, b) => (Date.parse(a.timestamp || '') || 0) - (Date.parse(b.timestamp || '') || 0));
    let bucket = [];
    let bucketIndex = 0;
    let lastTs = 0;
    for (const v of sorted) {
      const t = Date.parse(v.timestamp || '') || 0;
      if (!bucket.length) { bucket.push(v); lastTs = t; continue; }
      if (t - lastTs > SESSION_TIMEOUT) {
        sessions.push(buildSession(sid, bucket, bucketIndex));
        bucketIndex += 1;
        bucket = [v];
      } else {
        bucket.push(v);
      }
      lastTs = t;
    }
    if (bucket.length) sessions.push(buildSession(sid, bucket, bucketIndex));
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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const pageViews = JSON.parse(data || '[]');
    if (req.query && (req.query.aggregate === 'true' || req.query.aggregate === '1')) {
      return res.status(200).json(aggregate(pageViews));
    }
    return res.status(200).json(pageViews);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      if (req.query && (req.query.aggregate === 'true' || req.query.aggregate === '1')) {
        return res.status(200).json({ totalViews: 0, totalSessions: 0, pagesPerSession: 0, bounceRate: 0 });
      }
      return res.status(200).json([]);
    }
    console.error('Error reading stats:', err);
    return res.status(500).json({ message: 'Failed to retrieve stats' });
  }
}
