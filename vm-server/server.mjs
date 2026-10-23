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
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- Logging ----------
   logs/YYYY-MM-DD.log        events (info/warn/error), one JSON object per line
   logs/access-YYYY-MM-DD.log every request (time, ip, method, path, status, bytes, ms)
   logs/crash.log             stderr of node (written by run.cmd) – only for crashes before the logger runs
   Retention: older than logDays (default 30) are deleted, and the whole folder is capped at logMaxMB (default 200). */
const LOG_DIR = path.join(ROOT, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_DAYS = Number(cfg.logDays ?? 30), LOG_MAX = Number(cfg.logMaxMB ?? 200) * 1048576;
const LOG_NAME = /^(access-)?\d{4}-\d{2}-\d{2}\.log$|^crash\.log$|^server\.log$/;
function log(level, msg, data = {}) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...data });
  try { fs.appendFileSync(path.join(LOG_DIR, `${today()}.log`), line + '\n'); } catch { /* disk full – nothing we can do */ }
  if (level !== 'debug') process.stdout.write(line + '\n');
}
function accessLog(entry) {
  try { fs.appendFileSync(path.join(LOG_DIR, `access-${today()}.log`), JSON.stringify(entry) + '\n'); } catch { /* disk full */ }
}
function cleanupLogs() {
  const files = fs.readdirSync(LOG_DIR).filter(f => LOG_NAME.test(f)).map(f => {
    const st = fs.statSync(path.join(LOG_DIR, f)); return { f, size: st.size, mtime: st.mtimeMs };
  }).sort((a, b) => a.mtime - b.mtime);
  const cutoff = Date.now() - LOG_DAYS * 86400e3, todayName = `${today()}.log`;
  let total = files.reduce((a, x) => a + x.size, 0), removed = 0;
  for (const x of files) {
    const tooOld = x.mtime < cutoff, overCap = total > LOG_MAX;
    if (x.f === todayName || (!tooOld && !overCap)) continue;
    try { fs.rmSync(path.join(LOG_DIR, x.f)); total -= x.size; removed++; } catch { /* in use (crash.log) */ }
  }
  // crash.log is held open by run.cmd – shrink it instead of deleting when it gets big
  try { if (fs.statSync(path.join(LOG_DIR, 'crash.log')).size > 5 * 1048576) fs.truncateSync(path.join(LOG_DIR, 'crash.log'), 0); } catch { /* missing */ }
  if (removed) log('info', `Protokoll aufgeräumt: ${removed} alte Datei(en) gelöscht`);
}
const logFolderSize = () => fs.readdirSync(LOG_DIR).reduce((a, f) => { try { return a + fs.statSync(path.join(LOG_DIR, f)).size; } catch { return a; } }, 0);
process.on('uncaughtException', e => { log('error', 'Absturz: ' + e.message, { stack: e.stack }); process.exit(1); });
process.on('unhandledRejection', e => log('error', 'Unbehandelter Fehler: ' + (e?.message || e), { stack: e?.stack }));

/* Traffic statistics, persisted to stats.json every minute (survives the nightly restart).
   Visitors = distinct daily hash of IP + user agent (no raw IPs stored). Paths capped to keep the file small. */
const STATS_FILE = path.join(ROOT, 'stats.json');
const stats = (() => { try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch { return {}; } })();
stats.days ??= {}; stats.paths ??= {}; stats.status ??= {}; stats.total ??= 0; stats.bytes ??= 0; stats.deploys ??= []; stats.restarts ??= [];
stats.restarts = [STARTED.toISOString(), ...stats.restarts].slice(0, 20);
const visitorsToday = new Set();
function track(req, res, rel) {
  const d = today();
  const day = (stats.days[d] ??= { requests: 0, visitors: 0, pages: 0 });
  if (day.visitorsKey !== d) { visitorsToday.clear(); day.visitorsKey = d; }
  day.requests++; stats.total++;
  const v = crypto.createHash('sha256').update(d + (req.socket.remoteAddress || '') + (req.headers['user-agent'] || '')).digest('base64').slice(0, 16);
  if (!visitorsToday.has(v)) { visitorsToday.add(v); day.visitors++; }
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    accessLog({ t: new Date().toISOString(), ip: req.socket.remoteAddress, m: req.method, p: rel, s: res.statusCode,
      b: Number(res.getHeader('content-length') || 0), ms: Number(process.hrtime.bigint() - t0) / 1e6 | 0, ua: (req.headers['user-agent'] || '').slice(0, 160) });
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
process.on('SIGINT', () => { log('info', 'Server wird beendet'); saveStats(); process.exit(0); });

// CPU usage in % from two samples of os.cpus() (Windows has no load average).
let cpuPrev = os.cpus(), cpuPrevMon = os.cpus();
function cpuPercent(forMonitor = false) {
  const now = os.cpus(), base = forMonitor ? cpuPrevMon : cpuPrev;
  let idle = 0, total = 0;
  now.forEach((c, i) => {
    const p = base[i].times, t = c.times;
    const tot = Object.values(t).reduce((a, b) => a + b, 0) - Object.values(p).reduce((a, b) => a + b, 0);
    idle += t.idle - p.idle; total += tot;
  });
  if (forMonitor) cpuPrevMon = now; else cpuPrev = now;
  return total ? Math.round(100 * (1 - idle / total)) : 0;
}

/* ---------- Monitoring ----------
   Every minute: CPU, RAM, disk sampled (kept 24 h in stats.json), thresholds checked, state changes logged.
   Self-protection against a full disk: log cleanup, leftovers removed, uploads refused below MIN_FREE. */
const MIN_FREE = Number(cfg.minFreeMB ?? 1024) * 1048576;
const LIMITS = { disk: [85, 95], mem: [90, 97], cpu: [90, 98] };
stats.monitor ??= []; stats.events ??= [];
const levelState = {};
function diskInfo() { try { const f = fs.statfsSync(ROOT); return { total: f.blocks * f.bsize, free: f.bavail * f.bsize }; } catch { return null; } }
function event(level, msg) {
  log(level, msg);
  stats.events = [{ t: new Date().toISOString(), level, msg }, ...stats.events].slice(0, 100);
}
let cpuSlow = 0;
function monitor() {
  const disk = diskInfo(), mem = Math.round((1 - os.freemem() / os.totalmem()) * 100), cpu = cpuPercent(true);
  const diskPct = disk ? Math.round((1 - disk.free / disk.total) * 100) : null;
  stats.monitor.push({ t: Date.now(), cpu, mem, disk: diskPct });
  stats.monitor = stats.monitor.filter(x => Date.now() - x.t < 86400e3);
  // CPU only counts as high when it stays high for 5 minutes (short peaks are normal).
  cpuSlow = cpu >= LIMITS.cpu[0] ? cpuSlow + 1 : 0;
  const check = (key, label, value, limits, extra = '') => {
    if (value == null) return;
    const lvl = value >= limits[1] ? 'error' : value >= limits[0] ? 'warn' : 'ok';
    if (lvl !== (levelState[key] || 'ok')) {
      event(lvl === 'ok' ? 'info' : lvl, lvl === 'ok' ? `${label} wieder normal (${value} %)` : `${label} ${lvl === 'error' ? 'kritisch' : 'hoch'}: ${value} %${extra}`);
      levelState[key] = lvl;
    }
  };
  check('disk', 'Festplatte', diskPct, LIMITS.disk, disk ? ` – ${(disk.free / 1073741824).toFixed(1)} GB frei` : '');
  check('mem', 'Arbeitsspeicher', mem, LIMITS.mem);
  check('cpu', 'CPU-Last (5 min)', cpuSlow >= 5 ? cpu : 0, LIMITS.cpu);
  if (disk && disk.free < MIN_FREE * 2) cleanupLogs(); // free space early when it gets tight
}
function cleanupLeftovers() {
  for (const d of [SITE + '_old']) if (fs.existsSync(d)) { fs.rmSync(d, { recursive: true, force: true }); log('info', 'Übrig gebliebene alte Version gelöscht'); }
  // a staging folder older than 1 h is an abandoned upload
  try { if (Date.now() - fs.statSync(STAGING).mtimeMs > 3600e3) { fs.rmSync(STAGING, { recursive: true, force: true }); log('info', 'Abgebrochener Upload aufgeräumt'); } } catch { /* none */ }
}
const diskTooFull = () => { const d = diskInfo(); return d && d.free < MIN_FREE; };

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

/* Login: the page asks for the password every time it is opened. The token lives only in the page's memory
   (no cookie, no storage) – reload, new tab or another PC means a new password prompt. Tokens expire after 8 h.
   Brute force: 5 wrong attempts per IP lock that IP for 5 minutes. */
const TOKENS = new Map(); // token -> expiry
const FAILS = new Map();  // ip -> { n, until }
const TOKEN_TTL = 8 * 3600e3;
const passwordOk = pass => {
  const a = crypto.createHash('sha256').update(String(pass)).digest(), b = crypto.createHash('sha256').update(cfg.password).digest();
  return crypto.timingSafeEqual(a, b);
};
function authorized(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  const exp = m && TOKENS.get(m[1]);
  if (!exp || exp < Date.now()) { if (m) TOKENS.delete(m[1]); return false; }
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of TOKENS) if (v < now) TOKENS.delete(k); }, 600e3).unref();

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
  const json = (code, body) => res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(body));
  // The page itself holds no data – it shows the login form and loads everything after login.
  if (req.method === 'GET' && url.pathname === '/admin') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(ROOT, 'admin.html')).pipe(res);
  }
  if (req.method === 'POST' && url.pathname === '/admin/login') {
    const ip = req.socket.remoteAddress, f = FAILS.get(ip);
    if (f && f.until > Date.now()) return json(429, { error: 'Zu viele Fehlversuche – bitte 5 Minuten warten.' });
    let pass = '';
    try { pass = JSON.parse((await readBody(req, 4096)).toString()).password || ''; } catch { /* empty */ }
    if (!passwordOk(pass)) {
      const n = (f && f.until <= Date.now() && f.n >= 5 ? 0 : f?.n || 0) + 1;
      FAILS.set(ip, { n, until: n >= 5 ? Date.now() + 300e3 : 0 });
      log('warn', n >= 5 ? 'Anmeldung gesperrt nach 5 Fehlversuchen' : 'Falsches Passwort für /admin', { ip });
      return json(401, { error: n >= 5 ? 'Zu viele Fehlversuche – bitte 5 Minuten warten.' : 'Passwort falsch.' });
    }
    FAILS.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    TOKENS.set(token, Date.now() + TOKEN_TTL);
    log('info', 'Anmeldung an der Upload-Seite', { ip });
    return json(200, { token });
  }
  if (!authorized(req)) return json(401, { error: 'Anmeldung erforderlich' });
  if (req.method === 'POST' && url.pathname === '/admin/logout') {
    TOKENS.delete(req.headers.authorization.slice(7));
    return json(200, { ok: true });
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
      logBytes: logFolderSize(),
      logs: { days: LOG_DAYS, maxMB: LOG_MAX / 1048576, minFreeMB: MIN_FREE / 1048576 },
      monitor: stats.monitor.filter((_, i, a) => i % 5 === 0 || i === a.length - 1),
      events: stats.events.slice(0, 30),
    });
  }
  if (req.method === 'GET' && url.pathname === '/admin/logs') {
    const files = fs.readdirSync(LOG_DIR).filter(f => LOG_NAME.test(f)).sort().reverse()
      .map(f => ({ name: f, size: fs.statSync(path.join(LOG_DIR, f)).size }));
    const name = url.searchParams.get('name') || `${today()}.log`;
    if (!LOG_NAME.test(name)) return json(400, { error: 'Ungültiger Dateiname' });
    const file = path.join(LOG_DIR, name);
    if (url.searchParams.get('download')) {
      if (!fs.existsSync(file)) return json(404, { error: 'nicht gefunden' });
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` });
      return fs.createReadStream(file).pipe(res);
    }
    const level = url.searchParams.get('level') || '', q = (url.searchParams.get('q') || '').toLowerCase();
    const limit = Math.min(2000, Number(url.searchParams.get('limit')) || 300);
    let lines = [];
    // read at most the last 5 MB so huge files never block the server
    try {
      const st = fs.statSync(file), fd = fs.openSync(file, 'r'), len = Math.min(st.size, 5 * 1048576);
      const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, st.size - len); fs.closeSync(fd);
      lines = buf.toString('utf8').split('\n').filter(Boolean);
    } catch { /* file missing */ }
    const rows = [];
    for (let i = lines.length - 1; i >= 0 && rows.length < limit; i--) {
      let o; try { o = JSON.parse(lines[i]); } catch { o = { t: '', level: 'raw', msg: lines[i] }; }
      if (level && (o.level || (o.s >= 500 ? 'error' : o.s >= 400 ? 'warn' : 'info')) !== level) continue;
      if (q && !lines[i].toLowerCase().includes(q)) continue;
      rows.push(o);
    }
    return json(200, { files, name, rows });
  }
  if (req.method === 'POST' && url.pathname === '/admin/begin') {
    if (diskTooFull()) { event('error', 'Upload abgelehnt: Festplatte fast voll'); return json(507, { error: 'Festplatte fast voll – Upload abgelehnt' }); }
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
  event('info', `Neue Version veröffentlicht (${info.files} Dateien) – ${source}`);
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
    if (diskTooFull()) { watchState.message = 'Festplatte fast voll – Veröffentlichung pausiert'; return; }
    fs.rmSync(STAGING, { recursive: true, force: true });
    fs.cpSync(root, STAGING, { recursive: true });
    publish(`Ordner ${WATCH}`);
    for (const e of fs.readdirSync(WATCH)) fs.rmSync(path.join(WATCH, e), { recursive: true, force: true });
    lastSig = null; watchState.last = new Date().toISOString(); watchState.message = 'Veröffentlicht – wartet auf neue Version';
  } catch (e) { watchState.message = 'Fehler: ' + e.message; log('error', 'Upload-Ordner: ' + e.message, { stack: e.stack }); }
}
setInterval(checkWatch, 10_000).unref();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    admin(req, res, url).catch(e => { log('error', 'Admin-Anfrage fehlgeschlagen: ' + e.message, { path: url.pathname, stack: e.stack }); if (!res.headersSent) res.writeHead(500).end(); });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  serveSite(req, res);
});
server.on('error', e => { log('error', `Server kann nicht starten: ${e.message}`); process.exit(1); });
server.listen(PORT, () => {
  fs.writeFileSync(path.join(ROOT, 'server.pid'), String(process.pid));
  log('info', `Server gestartet auf Port ${PORT} (Node ${process.version}, PID ${process.pid})`);
});

cleanupLeftovers(); cleanupLogs(); monitor();
setInterval(monitor, 60_000).unref();
setInterval(() => { cleanupLogs(); cleanupLeftovers(); }, 3600e3).unref();
