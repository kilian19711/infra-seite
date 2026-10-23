// Website host for the Windows VM: serves the built site from ./site and offers /admin to upload a new build
// (drag & drop of the dist folder). Upload goes to ./staging; "commit" swaps it in and deletes the old version.
// No dependencies – only Node.js. Config: config.json { "port": 80, "password": "..." } (written by install.ps1).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, 'site');
const STAGING = path.join(ROOT, 'staging');
// install.ps1 (PowerShell 5.1) writes UTF-8 with BOM, which JSON.parse rejects.
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8').replace(/^﻿/, ''));
const PORT = Number(process.env.PORT || cfg.port || 80);
const MAX_FILE = 50 * 1024 * 1024;
const STARTED = new Date();

/* Traffic statistics, persisted to stats.json every minute (survives the nightly restart).
   Visitors = distinct daily hash of IP + user agent (no raw IPs stored). Paths capped to keep the file small. */
const STATS_FILE = path.join(ROOT, 'stats.json');
const stats = (() => { try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch { return {}; } })();
stats.days ??= {}; stats.paths ??= {}; stats.status ??= {}; stats.total ??= 0; stats.bytes ??= 0; stats.deploys ??= []; stats.restarts ??= [];
stats.restarts = [STARTED.toISOString(), ...stats.restarts].slice(0, 20);
const visitorsToday = new Set();
const today = () => new Date().toISOString().slice(0, 10);
function track(req, res, rel) {
  const d = today();
  const day = (stats.days[d] ??= { requests: 0, visitors: 0, pages: 0 });
  if (day.visitorsKey !== d) { visitorsToday.clear(); day.visitorsKey = d; }
  day.requests++; stats.total++;
  const v = crypto.createHash('sha256').update(d + (req.socket.remoteAddress || '') + (req.headers['user-agent'] || '')).digest('base64').slice(0, 16);
  if (!visitorsToday.has(v)) { visitorsToday.add(v); day.visitors++; }
  res.on('finish', () => {
    stats.status[res.statusCode] = (stats.status[res.statusCode] || 0) + 1;
    stats.bytes += Number(res.getHeader('content-length') || 0) || 0;
    if (!path.extname(rel) && res.statusCode === 200) {
      day.pages++;
      if (stats.paths[rel] || Object.keys(stats.paths).length < 500) stats.paths[rel] = (stats.paths[rel] || 0) + 1;
    }
  });
}
const saveStats = () => {
  const keep = Object.keys(stats.days).sort().slice(-90); // 90 days of history
  stats.days = Object.fromEntries(keep.map(k => [k, stats.days[k]]));
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
};
setInterval(saveStats, 60_000).unref();
process.on('SIGINT', () => { saveStats(); process.exit(0); });

// CPU usage in % from two samples of os.cpus() (Windows has no load average).
let cpuPrev = os.cpus();
function cpuPercent() {
  const now = os.cpus();
  let idle = 0, total = 0;
  now.forEach((c, i) => {
    const p = cpuPrev[i].times, t = c.times;
    const tot = Object.values(t).reduce((a, b) => a + b, 0) - Object.values(p).reduce((a, b) => a + b, 0);
    idle += t.idle - p.idle; total += tot;
  });
  cpuPrev = now;
  return total ? Math.round(100 * (1 - idle / total)) : 0;
}

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
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache, 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
}

function serveSite(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  track(req, res, rel);
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
  if (req.method === 'GET' && url.pathname === '/admin/info') {
    const index = path.join(SITE, 'index.html');
    let files = 0, bytes = 0;
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else { files++; bytes += fs.statSync(p).size; }
    });
    if (fs.existsSync(SITE)) walk(SITE);
    let disk = null;
    try { const f = fs.statfsSync(ROOT); disk = { total: f.blocks * f.bsize, free: f.bavail * f.bsize }; } catch { /* older Node */ }
    const ips = Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);
    const d = today();
    return json(200, {
      server: { started: STARTED, uptime: process.uptime(), port: PORT, node: process.version, pid: process.pid, memory: process.memoryUsage().rss, restarts: stats.restarts },
      system: { hostname: os.hostname(), os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model.trim(), cores: os.cpus().length, cpuPercent: cpuPercent(),
        memTotal: os.totalmem(), memFree: os.freemem(), uptime: os.uptime(), ips, disk },
      site: { live: fs.existsSync(index), published: fs.existsSync(index) ? fs.statSync(index).mtime : null, files, bytes },
      traffic: { today: stats.days[d] || { requests: 0, visitors: 0, pages: 0 }, total: stats.total, bytes: stats.bytes, status: stats.status,
        days: Object.entries(stats.days).sort().slice(-14).map(([day, v]) => ({ day, requests: v.requests, visitors: v.visitors, pages: v.pages })),
        top: Object.entries(stats.paths).sort((x, y) => y[1] - x[1]).slice(0, 8) },
      deploys: stats.deploys,
      watch: watchState,
      logBytes: (() => { try { return fs.statSync(path.join(ROOT, 'logs', 'server.log')).size; } catch { return 0; } })(),
    });
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
    publish(`Upload von ${req.socket.remoteAddress}`);
    return json(200, { ok: true });
  }
  json(404, { error: 'unbekannt' });
}

/** Swap ./staging in as the live site, delete the old version, log it. */
function publish(source) {
  const old = SITE + '_old';
  fs.rmSync(old, { recursive: true, force: true });
  if (fs.existsSync(SITE)) fs.renameSync(SITE, old);
  fs.renameSync(STAGING, SITE);
  fs.rmSync(old, { recursive: true, force: true });
  const info = { at: new Date().toISOString(), files: 0, source };
  const count = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? count(path.join(d, e.name)) : info.files++);
  count(SITE);
  stats.deploys = [info, ...stats.deploys].slice(0, 20); saveStats();
  console.log(info.at, 'neue Version veröffentlicht –', source);
}

/* Watch folder (config.watchDir): drop a build there (its files, or a "dist" folder) and it goes live automatically
   once nothing has changed for one check (10 s) – so a copy in progress is never published half-done. */
const WATCH = cfg.watchDir ? path.resolve(cfg.watchDir) : null;
// Its contents are deleted after publishing – so it must be a dedicated folder, never the server folder or a parent of it.
if (WATCH && (ROOT === WATCH || ROOT.startsWith(WATCH + path.sep) || [SITE, STAGING].some(d => WATCH === d || WATCH.startsWith(d + path.sep)))) {
  throw new Error(`watchDir ${WATCH} darf nicht der Server-Ordner oder ein übergeordneter Ordner sein.`);
}
const watchState = { dir: WATCH, last: null, message: WATCH ? 'Wartet auf neue Version' : 'Nicht eingerichtet' };
let lastSig = null;
function buildRoot(dir) {
  if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  const subs = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory());
  return subs.length === 1 && fs.existsSync(path.join(dir, subs[0].name, 'index.html')) ? path.join(dir, subs[0].name) : null;
}
function signature(dir) {
  let n = 0, size = 0, mt = 0;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    const st = fs.statSync(p); n++; size += st.size; mt = Math.max(mt, st.mtimeMs);
  });
  walk(dir);
  return `${n}:${size}:${mt}`;
}
function checkWatch() {
  try {
    if (!WATCH) return;
    fs.mkdirSync(WATCH, { recursive: true });
    const root = buildRoot(WATCH);
    if (!root) { lastSig = null; if (fs.readdirSync(WATCH).length) watchState.message = 'Ordner enthält keine index.html – wird ignoriert'; return; }
    const sig = signature(WATCH);
    if (sig !== lastSig) { lastSig = sig; watchState.message = 'Neue Version erkannt – warte, bis das Kopieren fertig ist …'; return; }
    fs.rmSync(STAGING, { recursive: true, force: true });
    fs.cpSync(root, STAGING, { recursive: true });
    publish(`Ordner ${WATCH}`);
    for (const e of fs.readdirSync(WATCH)) fs.rmSync(path.join(WATCH, e), { recursive: true, force: true });
    lastSig = null; watchState.last = new Date().toISOString(); watchState.message = 'Veröffentlicht – wartet auf neue Version';
  } catch (e) { watchState.message = 'Fehler: ' + e.message; console.error(e); }
}
setInterval(checkWatch, 10_000).unref();

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
