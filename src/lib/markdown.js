// Markdown subset for news posts – shared by the app, the editor preview and the prerender script (no dependency).
// Supports: frontmatter, ## / ### / #### headings, paragraphs, - lists, 1. lists, > quotes, **bold**, *italic*,
// [text](url), ![alt](url) images.
// ponytail: deliberately small; switch to a real parser (e.g. marked) if posts need tables or nested lists.

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = url => (/^(https?:\/\/|\/|mailto:|tel:)/.test(url) ? url : '#');

const inline = s =>
  esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
      const href = safeUrl(url);
      const ext = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${ext}>${text}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');

export function parseFrontmatter(raw) {
  const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else if (val === 'true' || val === 'false') val = val === 'true';
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

export function mdToHtml(md = '') {
  const out = [];
  let list = null, listTag = 'ul', para = [], quote = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`), (para = []);
    if (list) out.push(`<${listTag}>${list.map(li => `<li>${inline(li)}</li>`).join('')}</${listTag}>`), (list = null);
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`), (quote = []);
  };
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const h = t.match(/^(#{2,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const q = t.match(/^>\s?(.*)$/);
    if (q) { if (para.length || list) flush(); quote.push(q[1]); continue; }
    const ul = t.match(/^[-*]\s+(.*)$/), ol = t.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (para.length || quote.length || (list && listTag !== tag)) flush();
      listTag = tag;
      (list ||= []).push((ul || ol)[1]);
      continue;
    }
    if (list || quote.length) flush();
    para.push(t);
  }
  flush();
  return out.join('\n');
}

// Self-checks: escaping, links, lists, quotes, images, frontmatter.
console.assert(mdToHtml('<b>x</b>') === '<p>&lt;b&gt;x&lt;/b&gt;</p>', 'md escapes html');
console.assert(mdToHtml('[a](javascript:alert(1))').includes('href="#"'), 'md blocks js links');
console.assert(mdToHtml('## T\n- a\n- b\n\ntext **b**') === '<h2>T</h2>\n<ul><li>a</li><li>b</li></ul>\n<p>text <strong>b</strong></p>', 'md blocks');
console.assert(mdToHtml('1. a\n2. b') === '<ol><li>a</li><li>b</li></ol>', 'md ordered list');
console.assert(mdToHtml('> zitat') === '<blockquote><p>zitat</p></blockquote>', 'md quote');
console.assert(mdToHtml('*kursiv* und **fett**') === '<p><em>kursiv</em> und <strong>fett</strong></p>', 'md italic');
console.assert(mdToHtml('![Bild](/img/x.jpg)').includes('<img src="/img/x.jpg" alt="Bild"'), 'md image');
console.assert(parseFrontmatter('---\ntitle: "X"\ntags: [a, b]\ndraft: true\n---\nBody').meta.tags[1] === 'b', 'frontmatter');
