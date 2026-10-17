// Generates favicon.svg (logo mark), sitemap.xml and robots.txt into public/ – runs before every build.
import { readFileSync, writeFileSync } from 'node:fs';
import { publishedNews } from './news.mjs';

const ORIGIN = 'https://infrastructure-systemhaus.de';
const root = new URL('..', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

// Favicon: the two logo-mark halves, white on brand dark, rounded square.
const paths = read('src/components/logoPaths.js');
const mark = JSON.parse(paths.match(/MARK = (\[.*?\]);/s)[1].replace(/'/g, '"'));
const [x0, y0, x1, y1] = JSON.parse(paths.match(/MARK_BOX = (\[.*?\]);/)[1]);
const size = Math.max(x1 - x0, y1 - y0) * 1.35;
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
writeFileSync(new URL('public/favicon.svg', root),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx - size / 2} ${cy - size / 2} ${size} ${size}">` +
  `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="${size * 0.2}" fill="#0b1220"/>` +
  mark.map(d => `<path fill="#fff" d="${d}"/>`).join('') + '</svg>');

// Sitemap: every crawled page + app-only routes; prose/legal pages included.
const pages = JSON.parse(read('src/data/pages.json'));
const extra = ['softwareloesungen/profilestudio', 'ueber-uns', 'termin', 'schnell-check', 'ausfallkosten', 'phishing-training', 'referenzen', 'interaktiv/whitepaper', 'interaktiv/demo-anfordern', 'interaktiv/it-insights'];
const routes = [...new Set([...pages.map(p => p.route), ...extra, 'aktuelles', ...(await publishedNews()).map(p => `aktuelles/${p.slug}`)])].sort();
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('public/sitemap.xml', root),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  routes.map(r => `  <url><loc>${ORIGIN}/${r}${r ? '/' : ''}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
writeFileSync(new URL('public/robots.txt', root), `User-agent: *\nAllow: /\nDisallow: /redaktion\nSitemap: ${ORIGIN}/sitemap.xml\n`);

console.log(`site-files: favicon, sitemap (${routes.length} urls), robots`);
