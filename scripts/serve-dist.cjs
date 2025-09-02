const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf'
};
const root = path.join(__dirname, '..', 'dist_build');
const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const file = path.join(root, reqPath);
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    const ext = path.extname(file);
    const type = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(3000, () => console.log('serving dist_build on http://localhost:3000'));
