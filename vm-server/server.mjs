// Website host for the Windows VM: serves the built site from ./site and offers /admin to upload a new build
// (drag & drop of the dist folder). Upload goes to ./staging; "commit" swaps it in and deletes the old version.
// No dependencies – only Node.js. Config: config.json { "port": 80, "password": "..." } (written by install.ps1).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, 'site');
const STAGING = path.join(ROOT, 'staging');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = Number(process.env.PORT || cfg.port || 80);
const MAX_FILE = 50 * 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4',
};

/** Resolve a client-supplied relative path inside base; null if it would escape (../, absolute, drive letters). */
export function safeJoin(base, rel) {
  const clean = String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.includes('\0')) return null;
  const full = path.resolve(base, clean);
  return full.startsWith(base + path.sep) ? full : null;
}
// Self-check of the path guard (trust boundary for uploads).
console.assert(safeJoin(SITE, 'a/b.js') === path.join(SITE, 'a', 'b.js'));
console.assert(safeJoin(SITE, '../config.json') === null && safeJoin(SITE, '..\\x') === null && safeJoin(SITE, 'C:/x') === null);

function authorized(req) {
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const pass = Buffer.from(m[1], 'base64').toString().split(':').slice(1).join(':');
  const a = crypto.createHash('sha256').update(pass).digest(), b = crypto.createHash('sha256').update(cfg.password).digest();
  return crypto.timingSafeEqual(a, b);
}

function sendFile(res, file, status = 200) {
  const ext = path.extname(file).toLowerCase();
  const cache = ext === '.html' ? 'no-cache' : file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache });
  fs.createReadStream(file).pipe(res);
}

function serveSite(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  const file = rel === '/' ? path.join(SITE, 'index.html') : safeJoin(SITE, rel);
  const index = path.join(SITE, 'index.html');
  if (!fs.existsSync(index)) { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Noch keine Version hochgeladen – /admin öffnen.'); return; }
  if (file && fs.existsSync(file)) {
    const st = fs.statSync(file);
    if (st.isFile()) return sendFile(res, file);
    const inner = path.join(file, 'index.html'); // prerendered pages, e.g. /aktuelles/<slug>/
    if (fs.existsSync(inner)) return sendFile(res, inner);
  }
  // Missing asset → real 404; any other route → the single-page app.
  if (path.extname(rel)) { res.writeHead(404).end(); return; }
  sendFile(res, index);
}

const readBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

async function admin(req, res, url) {
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Website-Upload", charset="UTF-8"' }).end('Anmeldung erforderlich');
    return;
  }
  const json = (code, body) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  if (req.method === 'GET' && url.pathname === '/admin') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(ROOT, 'admin.html')).pipe(res);
  }
  if (req.method === 'POST' && url.pathname === '/admin/begin') {
    fs.rmSync(STAGING, { recursive: true, force: true });
    fs.mkdirSync(STAGING, { recursive: true });
    return json(200, { ok: true });
  }
  if (req.method === 'PUT' && url.pathname === '/admin/file') {
    const target = safeJoin(STAGING, url.searchParams.get('path') || '');
    if (!target) return json(400, { error: 'Ungültiger Pfad' });
    try {
      const body = await readBody(req, MAX_FILE);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
      return json(200, { ok: true });
    } catch (e) { return json(413, { error: e.message }); }
  }
  if (req.method === 'POST' && url.pathname === '/admin/commit') {
    // Refuse incomplete uploads so a half-finished upload never replaces a working site.
    if (!fs.existsSync(path.join(STAGING, 'index.html'))) return json(400, { error: 'index.html fehlt – falscher Ordner?' });
    const old = SITE + '_old';
    fs.rmSync(old, { recursive: true, force: true });
    if (fs.existsSync(SITE)) fs.renameSync(SITE, old);
    fs.renameSync(STAGING, SITE);
    fs.rmSync(old, { recursive: true, force: true });
    console.log(new Date().toISOString(), 'neue Version veröffentlicht');
    return json(200, { ok: true });
  }
  json(404, { error: 'unbekannt' });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    admin(req, res, url).catch(e => { console.error(e); if (!res.headersSent) res.writeHead(500).end(); });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  serveSite(req, res);
}).listen(PORT, () => {
  fs.writeFileSync(path.join(ROOT, 'server.pid'), String(process.pid));
  console.log(new Date().toISOString(), `Website läuft auf Port ${PORT} – Upload unter /admin`);
});
