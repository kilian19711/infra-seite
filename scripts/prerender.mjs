// After `vite build`: write a static HTML file per published news post (+ /aktuelles) so search engines
// get title, description, structured data and the full article without running JavaScript.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { publishedNews } from './news.mjs';

const ORIGIN = 'https://infrastructure-systemhaus.de';
const dist = new URL('../dist/', import.meta.url);
const shell = readFileSync(new URL('index.html', dist), 'utf8');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ path, title, description, body, jsonld, type = 'website' }) {
  const url = `${ORIGIN}/${path}/`;
  const head = [
    `<title>${esc(title)} | L-mobile infrastructure</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    jsonld && `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\u003c')}</script>`,
  ].filter(Boolean).join('\n    ');
  const html = shell
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<meta property="og:type"[^>]*>/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`); // React replaces this on load
  mkdirSync(new URL(`${path}/`, dist), { recursive: true });
  writeFileSync(new URL(`${path}/index.html`, dist), html);
}

const posts = (await publishedNews()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
for (const p of posts) {
  page({
    path: `aktuelles/${p.slug}`,
    title: p.title,
    description: p.summary,
    type: 'article',
    body: `<article><h1>${esc(p.title)}</h1><p>${esc(p.summary)}</p>${p.html}</article>`,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'NewsArticle', headline: p.title, description: p.summary,
      datePublished: p.date, dateModified: p.date, author: { '@type': 'Organization', name: p.author || 'L-mobile infrastructure' },
      publisher: { '@type': 'Organization', name: 'L-mobile infrastructure', logo: { '@type': 'ImageObject', url: `${ORIGIN}/logo.png` } },
      mainEntityOfPage: `${ORIGIN}/aktuelles/${p.slug}/`, keywords: (p.tags || []).join(', '),
      ...(p.sourceUrl ? { isBasedOn: p.sourceUrl } : {}),
    },
  });
}
page({
  path: 'aktuelles',
  title: 'Aktuelles – IT-Sicherheit aktuell',
  description: 'Aktuelle Meldungen zu Cyberangriffen und IT-Sicherheit – eingeordnet mit konkreten Handlungsempfehlungen für Unternehmen in der Region Stuttgart.',
  body: `<h1>Aktuelles</h1><ul>${posts.map(p => `<li><a href="/aktuelles/${p.slug}/">${esc(p.title)}</a> – ${esc(p.summary)}</li>`).join('')}</ul>`,
});
console.log(`prerender: ${posts.length} news posts + /aktuelles`);
