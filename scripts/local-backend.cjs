const http = require('http');

const server = http.createServer((req, res) => {
  // Normalize path: Vite proxy rewrites /api -> '' by default in this project,
  // so accept both /api/health and /health (and same for stats).
  const rawPath = req.url ? decodeURIComponent(req.url.split('?')[0]) : '/';
  const path = rawPath.startsWith('/api/') ? rawPath.slice(4) : rawPath;

  if (path === '/health' || path === '/api/health' || rawPath === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString(), version: 'local' }));
  }

  if (path === '/stats' || path === '/api/stats' || rawPath === '/api/stats') {
    const fs = require('fs');
    const pathMod = require('path');
    const outFile = pathMod.join(__dirname, '..', 'data', 'local-events.json');
    let arr = [];
    try {
      const txt = fs.readFileSync(outFile, 'utf8');
      arr = JSON.parse(txt || '[]');
    } catch (e) {
      arr = [];
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // support ?aggregate=true
    const url = req.url || '';
    const agg = url.includes('aggregate=true');
    if (agg) {
      const totalViews = arr.length;
      const totalSessions = arr.length; // simple local approximation
      const pagesPerSession = totalSessions ? (arr.reduce((acc, v) => acc + (v.page ? 1 : 0), 0) / totalSessions) : 0;
      const bounces = 0;
      const bounceRate = totalSessions ? (bounces / totalSessions) * 100 : 0;
      res.writeHead(200);
      return res.end(JSON.stringify({ totalViews, totalSessions, pagesPerSession: Number(pagesPerSession.toFixed(2)), bounceRate: Number(bounceRate.toFixed(2)) }));
    }

    res.writeHead(200);
    return res.end(JSON.stringify(arr));
  }

  // Accept a POST /api/track for local testing: append event to a local file.
  if ((path === '/track' || path === '/api/track' || rawPath === '/api/track') && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const obj = JSON.parse(body || '{}');
        const fs = require('fs');
        const pathMod = require('path');
        const outDir = pathMod.join(__dirname, '..', 'data');
        const outFile = pathMod.join(outDir, 'local-events.json');
        try {
          fs.mkdirSync(outDir, { recursive: true });
        } catch (e) {}
        let arr = [];
        try { arr = JSON.parse(fs.readFileSync(outFile, 'utf8') || '[]'); } catch (e) { arr = []; }
        arr.push(obj);
        fs.writeFileSync(outFile, JSON.stringify(arr, null, 2), 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(201);
        return res.end(JSON.stringify({ message: 'Tracked locally', entries: arr.length }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'invalid payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(5176, () => console.log('local backend listening on http://127.0.0.1:5176'));
