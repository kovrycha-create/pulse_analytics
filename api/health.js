module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end('');
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const payload = {
    ok: true,
    version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || 'unknown',
    ts: new Date().toISOString()
  };

  res.statusCode = 200;
  res.end(JSON.stringify(payload));
};
