import { useEffect, useState } from 'react';
import { parseFrontmatter, mdToHtml } from '../lib/markdown';
import { cms } from '../lib/cms';

// Static posts: every .md in src/content/news except "_" files (template). Drafts only show in dev.
const files = import.meta.glob(['../content/news/*.md', '!../content/news/_*.md'], { query: '?raw', import: 'default', eager: true });

export const slugOf = path => path.split('/').pop().replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');

const byDate = (a, b) => String(b.date).localeCompare(String(a.date));

export const news = Object.entries(files)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    const author = meta.author ? { name: meta.author, role: meta.authorRole || '', avatar_url: meta.authorImage || '' } : null;
    return { ...meta, slug: slugOf(path), body_md: body, html: mdToHtml(body), tags: meta.tags || [], services: meta.services || [], author, static: true };
  })
  .filter(p => import.meta.env.DEV || !p.draft)
  .sort(byDate);

export const newsBySlug = Object.fromEntries(news.map(p => [p.slug, p]));
export const fmtDate = d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

// Posts from the Redaktion (Supabase) – normalised to the static shape.
const fromCms = p => ({
  slug: p.slug, title: p.title, summary: p.summary, date: (p.published_at || p.updated_at || '').slice(0, 10),
  html: mdToHtml(p.body_md), tags: p.tags || [], services: p.services || [], source: p.source, sourceUrl: p.source_url,
  cover: p.cover_url, auto: !!p.auto,
  author: p.author || (p.byline ? { name: p.byline, role: 'IT-Sicherheit aktuell', avatar_url: '/favicon.svg' } : null),
});

let cache = null;
/** Static + CMS posts, CMS wins on slug clash. Static list renders immediately; CMS posts stream in. */
export function useNews() {
  const [list, setList] = useState(cache || news);
  useEffect(() => {
    if (cache) return;
    cms.publishedPosts()
      .then(rows => {
        const remote = rows.map(fromCms);
        const slugs = new Set(remote.map(p => p.slug));
        cache = [...remote, ...news.filter(p => !slugs.has(p.slug))].sort(byDate);
        setList(cache);
      })
      .catch(() => { /* offline/backend down: static posts still show */ });
  }, []);
  return list;
}
