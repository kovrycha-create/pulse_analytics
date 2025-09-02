import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Quick ping check
  if (req.query.ping === '1') {
    res.status(200).json({ ok: true });
    return;
  }
  // Full health response (single, consistent response)
  try {
    // In a real app, you might want to check database connectivity here
    const version =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GITHUB_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      'unknown';

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      version
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: (error && (error as Error).message) || 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}
