// fetch-news: reads public RSS/Atom feeds, rates relevance with AI (Langdock) and writes original draft
// commentaries into public.suggestions. Runs every morning via pg_cron (see supabase/cron.sql) or on demand
// from the Redaktion ("Jetzt neu prüfen").
//
// Only headline + teaser + link from PUBLIC feeds are used – no paywalled (heise+) or full article text is fetched.
// The AI is instructed to write its own commentary and never reproduce source wording.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   LANGDOCK_API_KEY   required for AI drafts (without it, suggestions are stored without drafts)
//   LANGDOCK_API_URL   optional, default Anthropic-compatible EU endpoint below
//   LANGDOCK_MODEL     optional, default below – check the model name in your Langdock workspace
import { createClient } from 'npm:@supabase/supabase-js@2';

const FEEDS: [string, string][] = [
  ['heise Security', 'https://www.heise.de/security/rss/news-atom.xml'],
  ['BSI', 'https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSNewsfeed_Presse_Veranstaltungen.xml'],
  ['CERT-Bund', 'https://wid.cert-bund.de/content/public/securityAdvisory/rss'],
  ['golem.de', 'https://rss.golem.de/rss.php?feed=RSS2.0'],
  ['t3n', 'https://t3n.de/rss.xml'],
  ['Microsoft Security', 'https://www.microsoft.com/en-us/security/blog/feed/'],
];
const MAX_AGE_H = 48;      // only recent items
const MAX_RATE = 40;       // items sent to relevance rating per run
const MAX_DRAFTS = 6;      // AI drafts per run (cost control)
const MIN_RELEVANCE = 6;   // draft only if relevance >= this

const SERVICES = ['it-sicherheit', 'it-infrastruktur', 'it-infrastruktur/managed-services', 'it-infrastruktur/netzwerkloesungen',
  'it-infrastruktur/serverloesungen', 'it-infrastruktur/wlan-loesungen', 'it-infrastruktur/voip-telefonie',
  'softwareloesungen/desktop-management-software', 'softwareloesungen/dokumenten-management-systeme',
  'softwareloesungen/microsoft-365-azure', 'digitalisierung-von-schulen', 'schnell-check', 'phishing-training', 'ausfallkosten'];

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Item = { source: string; title: string; url: string; teaser: string; published_at: string | null };

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '';

function parseFeed(xml: string, source: string): Item[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks.map(b => {
    const link = tag(b, 'link') || b.match(/<link[^>]*href="([^"]+)"/i)?.[1] || '';
    const date = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date');
    const d = date ? new Date(decode(date)) : null;
    return {
      source,
      title: decode(tag(b, 'title')).slice(0, 300),
      url: decode(link),
      teaser: decode(tag(b, 'description') || tag(b, 'summary')).slice(0, 500),
      published_at: d && !isNaN(+d) ? d.toISOString() : null,
    };
  }).filter(i => i.title && /^https?:\/\//.test(i.url));
}

async function ai(system: string, user: string, maxTokens: number): Promise<string> {
  const key = Deno.env.get('LANGDOCK_API_KEY');
  if (!key) throw new Error('LANGDOCK_API_KEY fehlt');
  const res = await fetch(Deno.env.get('LANGDOCK_API_URL') ?? 'https://api.langdock.com/anthropic/eu/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('LANGDOCK_MODEL') ?? 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Langdock ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
}
const parseJson = (s: string) => JSON.parse(s.slice(s.indexOf(s.trim().startsWith('[') ? '[' : '{'), s.lastIndexOf(s.trim().startsWith('[') ? ']' : '}') + 1));

const slugify = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'beitrag';

async function uniqueSlug(admin: ReturnType<typeof createClient>, base: string) {
  const { data } = await admin.from('posts').select('slug').like('slug', `${base}%`);
  const taken = new Set((data ?? []).map(d => d.slug));
  let slug = base, n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
// Quality gate for auto-publishing: full structure, enough substance, service links, and no copied source wording
// (any 8-word run from the source teaser/title appearing verbatim blocks publication).
function passesQuality(r: Record<string, any>): boolean {
  const body = String(r.draft_body_md ?? '');
  const heads = ['## Was ist passiert?', '## Unsere Einschätzung', '## Was Sie jetzt tun sollten', '## So helfen wir'];
  if (!heads.every(h => body.includes(h))) return false;
  if (words(body).length < 200 || String(r.draft_title ?? '').length < 15 || String(r.draft_summary ?? '').length < 60) return false;
  if (!/\]\(\/[a-z0-9/-]+\)/.test(body)) return false;
  const src = words(`${r.title} ${r.teaser}`), b = ` ${words(body).join(' ')} `;
  for (let i = 0; i + 8 <= src.length; i++) if (b.includes(` ${src.slice(i, i + 8).join(' ')} `)) return false;
  return true;
}

const CONTEXT = `L-mobile infrastructure ist ein IT-Systemhaus aus Sulzbach an der Murr (Region Stuttgart) für Mittelstand, Schulen und Gemeinden.
Leistungen: IT-Sicherheit (Cybersecurity-Check nach OZELOT-Methode, Firewall/Sophos, Backup, Awareness), Managed Services, Netzwerk, Server, WLAN,
VoIP (Swyx/Enreach), Desktop Management (baramundi), Dokumentenmanagement (ELO), Microsoft 365 & Azure, Digitalisierung von Schulen (Digitalpakt).`;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Allowed callers: signed-in editor (JWT) or the morning cron job (secret kept in the DB vault).
  const cron = req.headers.get('x-cron-secret');
  let allowed = false;
  if (cron) allowed = (await admin.rpc('check_cron_secret', { s: cron })).data === true;
  else {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '');
    if (jwt) allowed = !!(await admin.auth.getUser(jwt)).data.user;
  }
  if (!allowed) return json({ error: 'unauthorized' }, 401);

  // 1. Collect recent items from all feeds
  const since = Date.now() - MAX_AGE_H * 3600e3;
  const results = await Promise.allSettled(FEEDS.map(async ([name, url]) => {
    const r = await fetch(url, { headers: { 'User-Agent': 'L-mobile-infrastructure-news-check/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return parseFeed(await r.text(), name);
  }));
  const feedErrors = results.flatMap((r, i) => (r.status === 'rejected' ? [`${FEEDS[i][0]}: ${r.reason}`] : []));
  let items = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .filter(i => !i.published_at || +new Date(i.published_at) >= since);

  // 2. Skip items we already know
  const { data: known } = await admin.from('suggestions').select('url').in('url', items.map(i => i.url));
  const seen = new Set((known ?? []).map(k => k.url));
  const fresh = [...new Map(items.filter(i => !seen.has(i.url)).map(i => [i.url, i])).values()];
  // Fair share per source so one busy feed (e.g. CERT-Bund) can't crowd out the others.
  const perSource = Math.ceil(MAX_RATE / FEEDS.length);
  items = FEEDS.flatMap(([name]) => fresh
    .filter(i => i.source === name)
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    .slice(0, perSource));
  if (!items.length) return json({ added: 0, feedErrors });

  // 3. Rate relevance in one call (cheap). Without API key: store with relevance 0, no drafts.
  let ratings: { i: number; relevance: number; reason: string; tags: string[]; services: string[] }[] = [];
  let aiError: string | null = null;
  try {
    const out = await ai(
      `${CONTEXT}\nBewerte Meldungen nach Relevanz (0–10) für die Kunden dieses Systemhauses. Hoch: konkrete Bedrohungen/Lücken für Mittelstand, Microsoft/VPN/Firewall/Backup, Ransomware, Phishing, Schulen, gesetzliche Pflichten (NIS2). Niedrig: Consumer-Gadgets, Spiele, US-Politik.\nAntworte NUR mit JSON-Array: [{"i":Index,"relevance":0-10,"reason":"1 Satz deutsch","tags":["max 3 Themen deutsch"],"services":["passende aus: ${SERVICES.join(', ')}"]}]`,
      items.map((it, i) => `${i}. [${it.source}] ${it.title} — ${it.teaser.slice(0, 200)}`).join('\n'),
      3000,
    );
    ratings = parseJson(out);
  } catch (e) { aiError = String(e); }

  const rows = items.map((it, i) => {
    const r = ratings.find(x => x.i === i);
    return { ...it, relevance: Math.max(0, Math.min(10, Math.round(r?.relevance ?? 0))), reason: r?.reason ?? '', tags: r?.tags ?? [], services: (r?.services ?? []).filter(s => SERVICES.includes(s)) };
  });

  // 4. Original draft commentary for the most relevant items
  if (!aiError) {
    const top = rows.filter(r => r.relevance >= MIN_RELEVANCE).sort((a, b) => b.relevance - a.relevance).slice(0, MAX_DRAFTS);
    await Promise.allSettled(top.map(async row => {
      const out = await ai(
        `${CONTEXT}
Du schreibst für den Bereich „Aktuelles“ der Website eine EIGENE, sachliche Einordnung einer Nachricht auf Deutsch (Sie-Form).
Regeln:
- Dir liegen nur Überschrift und Kurztext der Meldung vor. Erfinde keine Details, Zahlen, Versionen oder Zitate, die dort nicht stehen. Wenn etwas unklar ist, formuliere allgemein und weise auf die verlinkte Quelle hin.
- Übernimm keine Formulierungen der Quelle. Schreibe vollständig in eigenen Worten. Keine wörtlichen Zitate.
- Kein Marketing-Gerede, keine Emojis. Konkret und hilfreich für Geschäftsführung und IT-Verantwortliche im Mittelstand.
- Format Markdown, genau diese Abschnitte: "## Was ist passiert?", "## Unsere Einschätzung", "## Was Sie jetzt tun sollten" (3–5 Stichpunkte mit "- "), "## So helfen wir" (mit 1–2 Links im Format [Text](/pfad) aus: ${SERVICES.map(s => '/' + s).join(', ')}).
- 250–450 Wörter.
Antworte NUR mit JSON: {"title":"suchmaschinenfreundlicher Titel, max 90 Zeichen","summary":"120–155 Zeichen","body_md":"..."}`,
        `Quelle: ${row.source}\nÜberschrift: ${row.title}\nKurztext: ${row.teaser}\nLink: ${row.url}`,
        2500,
      );
      const d = parseJson(out);
      Object.assign(row, { draft_title: String(d.title ?? '').slice(0, 200), draft_summary: String(d.summary ?? '').slice(0, 300), draft_body_md: String(d.body_md ?? '') });
    }));
  }

  const { data: saved, error } = await admin.from('suggestions').upsert(rows, { onConflict: 'url', ignoreDuplicates: true }).select('id, url');
  if (error) return json({ error: error.message, feedErrors, aiError }, 500);

  // 5. Optional auto-publish (switch in Redaktion → Automatik). Only drafts that pass the quality gate go live.
  const published: string[] = [];
  const { data: cfg } = await admin.from('settings').select('*').eq('id', 1).maybeSingle();
  if (cfg?.auto_publish && !aiError) {
    const candidates = rows
      .filter((r: Record<string, unknown>) => r.relevance >= cfg.min_relevance && passesQuality(r))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, cfg.max_per_run);
    for (const r of candidates as Record<string, any>[]) {
      const slug = await uniqueSlug(admin, slugify(r.draft_title));
      const { error: e } = await admin.from('posts').insert({
        slug, title: r.draft_title, summary: r.draft_summary, body_md: r.draft_body_md,
        tags: r.tags, services: r.services.length ? r.services : ['it-sicherheit', 'schnell-check'],
        source: r.source, source_url: r.url, status: 'published', published_at: new Date().toISOString(),
        auto: true, byline: cfg.byline, author_id: null,
      });
      if (e) continue;
      published.push(slug);
      const id = saved?.find(s => s.url === r.url)?.id;
      if (id) await admin.from('suggestions').update({ status: 'used' }).eq('id', id);
    }
  }
  return json({ added: rows.length, drafted: rows.filter(r => 'draft_body_md' in r).length, published, feedErrors, aiError });
});
