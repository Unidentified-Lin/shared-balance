const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT 必須是 1–65535 的整數。');
  process.exit(1);
}
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const inside = file => {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
const server = http.createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405, {Allow:'GET, HEAD'}); res.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!inside(file)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    const actual = await fs.realpath(file);
    if (!inside(actual)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await fs.readFile(actual);
    res.writeHead(200, {'Content-Type':types[path.extname(actual)] || 'application/octet-stream',
      'Content-Length':body.length, 'Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `連接埠 ${port} 已被占用，請停止既有服務或設定 PORT。` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`一起有餘：http://localhost:${port}\n按 Ctrl+C 停止。`));
