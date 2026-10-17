// Published news for build scripts (sitemap + prerender): static .md files + posts from the Redaktion (Supabase).
import { readdirSync, readFileSync } from 'node:fs';
import { parseFrontmatter, mdToHtml } from '../src/lib/markdown.js';

const root = new URL('../', import.meta.url);
const dir = new URL('src/content/news/', root);

// Vite env files are not loaded for plain node scripts – read the two public values ourselves.
const env = Object.fromEntries(['.env', '.env.local', '.env.production', '.env.production.local'].flatMap(f => {
  try {
    return readFileSync(new URL(f, root), 'utf8').split(/\r?\n/)
      .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]);
  } catch { return []; }
}));
const SB_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const staticNews = () =>
  readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => {
      const { meta, body } = parseFrontmatter(readFileSync(new URL(f, dir), 'utf8'));
      return { ...meta, slug: f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''), html: mdToHtml(body) };
    })
    .filter(p => !p.draft);

async function cmsNews() {
  if (!SB_URL || !SB_KEY) return [];
  try {
    const res = await fetch(`${SB_URL}/rest/v1/posts?status=eq.published&select=*,author:authors(name,role,avatar_url)&order=published_at.desc`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).map(p => ({
      slug: p.slug, title: p.title, summary: p.summary, date: (p.published_at || '').slice(0, 10), tags: p.tags,
      sourceUrl: p.source_url, author: p.author?.name || p.byline, html: mdToHtml(p.body_md), cover: p.cover_url,
    }));
  } catch (e) {
    console.warn(`news: Supabase nicht erreichbar (${e.message}) – nur statische Beiträge`);
    return [];
  }
}

let cached;
export async function publishedNews() {
  if (cached) return cached;
  const remote = await cmsNews();
  const slugs = new Set(remote.map(p => p.slug));
  return (cached = [...remote, ...staticNews().filter(p => !slugs.has(p.slug))]);
}
