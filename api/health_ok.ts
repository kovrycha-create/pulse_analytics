import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const requestOrigin = (req.headers.origin as string) || '';
  const allowOrigin = process.env.DASHBOARD_ORIGIN || process.env.VITE_DASHBOARD_ORIGIN || requestOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  return res.status(200).json({ ok: true });
}
