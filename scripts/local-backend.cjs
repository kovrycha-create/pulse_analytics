const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/health')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString(), version: 'local' }));
  }

  if (req.url && req.url.startsWith('/api/stats')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    return res.end(JSON.stringify([]));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(5176, () => console.log('local backend listening on http://127.0.0.1:5176'));
