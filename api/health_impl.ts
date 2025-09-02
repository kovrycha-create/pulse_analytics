import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';

const DB_PATH = path.join('/tmp', 'data', 'db.json');

function nowIso() { return new Date().toISOString(); }

async function checkDb() {
  const start = Date.now();
  try {
    const stat = await fs.stat(DB_PATH);
    const duration = Date.now() - start;
    // If file exists but is tiny, consider degraded
    if (stat.size === 0) return { state: 'degraded', duration };
    return { state: 'ok', duration };
  } catch (err: any) {
    if (err && err.code === 'ENOENT') return { state: 'down', duration: Date.now() - start };
    return { state: 'degraded', duration: Date.now() - start };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // CORS origin should be provided via env to avoid hardcoding.
  const origin = process.env.DASHBOARD_ORIGIN || process.env.VITE_DASHBOARD_ORIGIN || '*';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', origin);

  const pingOnly = req.query.ping === '1' || req.query.ping === 'true';

  try {
    const db = await checkDb();

    const payload = {
      ok: db.state === 'ok',
      version: process.env.npm_package_version || process.env.PULSE_VERSION || '1.0.0',
      uptime_s: Math.floor(process.uptime()),
      db: db.state as 'ok' | 'degraded' | 'down',
      last_event_ts: new Date().toISOString(),
      server_time: new Date().toISOString(),
      _meta: pingOnly ? { ping: true } : undefined
    } as any;

    const statusCode = payload.ok ? 200 : 503;
    return res.status(statusCode).json(payload);
  } catch (err: any) {
    return res.status(500).json({ ok: false, version: 'unknown', uptime_s: 0, db: 'down', last_event_ts: nowIso(), server_time: nowIso(), error: String(err) });
  }
}
