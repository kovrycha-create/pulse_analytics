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

  // Full health response
  const data = {
    ok: true,
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(data);
  
  try {
    // In a real app, you might want to check database connectivity here
    // For now, we'll just return a basic health check
    return res.status(200).json({ 
      ok: true,
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'development'
    });
  } catch (error) {
    return res.status(500).json({ 
      ok: false, 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}
