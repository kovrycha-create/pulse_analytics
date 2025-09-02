import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const origin = process.env.DASHBOARD_ORIGIN || process.env.VITE_DASHBOARD_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  return res.status(200).json({ ok: true });
}
