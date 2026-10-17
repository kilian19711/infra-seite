import { createClient } from '@supabase/supabase-js';
import { useEffect as useEffectHook, useState as useStateHook } from 'react';

/*
 * CMS data layer. With VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set (.env.local) everything goes to Supabase
 * (tables/RLS/bucket in supabase/schema.sql). Without them the editor runs in DEMO mode on localStorage so it can
 * be tried before the backend exists – demo data never leaves this browser.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const DEMO = !supabase;

export const slugify = s =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
console.assert(slugify('Neue Phishing-Welle: Was tun?') === 'neue-phishing-welle-was-tun', 'slugify');

/* ---------- demo store ---------- */
const LS = 'lmi-cms-demo';
const now = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const demoSeed = () => ({
  user: { id: 'demo-user', email: 'demo@localhost' },
  authors: [{ id: 'demo-user', name: 'Kilian Ulmer', role: 'Redaktion', avatar_url: '', bio: '' }],
  posts: [],
  // Clearly marked sample suggestions so the workflow can be tried – not real news.
  suggestions: [
    { id: uid(), source: 'Beispielquelle', title: 'BEISPIEL: Kritische Sicherheitslücke in verbreiteter VPN-Software', teaser: 'Beispiel-Vorschlag zum Ausprobieren. Im Echtbetrieb stehen hier jeden Morgen echte Meldungen aus den Quellen.', url: '', published_at: now(), relevance: 9, reason: 'Viele Mittelständler nutzen VPN für Homeoffice – hohe Relevanz.', draft_title: 'Sicherheitslücke in VPN-Software: Was Unternehmen jetzt prüfen sollten', draft_summary: 'Eine kritische Lücke betrifft VPN-Zugänge. Wir erklären, wer betroffen ist und welche Schritte jetzt wichtig sind.', draft_body_md: '## Was ist passiert?\n\nBeispieltext: Hier fasst die KI die Meldung in eigenen Worten zusammen.\n\n## Unsere Einschätzung\n\nBeispieltext.\n\n## Was Sie jetzt tun sollten\n\n- Updates prüfen und einspielen\n- Zugänge mit Multi-Faktor-Authentifizierung absichern\n- Protokolle auf verdächtige Anmeldungen prüfen\n\n## So helfen wir\n\nWir prüfen Ihre Fernzugänge im Rahmen unseres [Cybersecurity-Checks](/it-sicherheit).', tags: ['IT-Sicherheit', 'VPN'], services: ['it-sicherheit', 'it-infrastruktur/netzwerkloesungen'], status: 'new', created_at: now() },
    { id: uid(), source: 'Beispielquelle', title: 'BEISPIEL: Neue Funktionen für Microsoft 365 Administratoren', teaser: 'Zweiter Beispiel-Vorschlag mit geringerer Relevanz.', url: '', published_at: now(), relevance: 5, reason: 'Interessant für M365-Kunden, aber kein akutes Risiko.', draft_title: 'Microsoft 365: Diese Änderungen betreffen Administratoren', draft_summary: 'Beispiel-Zusammenfassung.', draft_body_md: '## Was ist passiert?\n\nBeispieltext.', tags: ['Microsoft 365'], services: ['softwareloesungen/microsoft-365-azure'], status: 'new', created_at: now() },
  ],
});
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || demoSeed(); } catch { return demoSeed(); } };
const save = db => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch { /* storage full/blocked */ } return db; };
const readFileAsDataUrl = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

const unwrap = ({ data, error }) => { if (error) throw error; return data; };

/* ---------- API (same shape for demo + Supabase) ---------- */
export const cms = {
  async session() {
    if (DEMO) return load().user;
    return (await supabase.auth.getSession()).data.session?.user ?? null;
  },
  onAuth(cb) {
    if (DEMO) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  },
  // ponytail: email + password for the test phase. Go-live: SSO (Entra ID) or password + MFA – see GO-LIVE.md.
  async signIn(email, password) {
    if (DEMO) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-Mail oder Passwort ist falsch.' : error.message);
  },
  async signOut() { if (!DEMO) await supabase.auth.signOut(); },

  async myAuthor(user) {
    if (DEMO) return load().authors[0];
    const row = unwrap(await supabase.from('authors').select('*').eq('id', user.id).maybeSingle());
    return row || { id: user.id, name: user.email.split('@')[0], role: '', avatar_url: '', bio: '' };
  },
  async saveAuthor(a) {
    if (DEMO) { const db = load(); db.authors = [a]; save(db); return a; }
    return unwrap(await supabase.from('authors').upsert(a).select().single());
  },

  async posts() {
    if (DEMO) return load().posts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return unwrap(await supabase.from('posts').select('*').order('updated_at', { ascending: false }));
  },
  async savePost(p) {
    const row = { ...p, slug: p.slug || slugify(p.title), updated_at: now() };
    if (row.status === 'published' && !row.published_at) row.published_at = now();
    if (DEMO) {
      const db = load();
      row.id ||= uid();
      db.posts = [row, ...db.posts.filter(x => x.id !== row.id)];
      save(db);
      return row;
    }
    return unwrap(await supabase.from('posts').upsert(row).select().single());
  },
  async deletePost(id) {
    if (DEMO) { const db = load(); db.posts = db.posts.filter(p => p.id !== id); save(db); return; }
    unwrap(await supabase.from('posts').delete().eq('id', id));
  },

  async suggestions() {
    if (DEMO) return load().suggestions.filter(s => s.status === 'new').sort((a, b) => b.relevance - a.relevance);
    return unwrap(await supabase.from('suggestions').select('*').eq('status', 'new').order('relevance', { ascending: false }).order('created_at', { ascending: false }).limit(50));
  },
  async setSuggestion(id, status) {
    if (DEMO) { const db = load(); db.suggestions = db.suggestions.map(s => (s.id === id ? { ...s, status } : s)); save(db); return; }
    unwrap(await supabase.from('suggestions').update({ status }).eq('id', id));
  },
  async refreshSuggestions() {
    if (DEMO) throw new Error('Im Demo-Modus nicht verfügbar – die Quellen werden erst mit verbundenem Supabase abgerufen.');
    unwrap(await supabase.functions.invoke('fetch-news', { body: {} }));
  },

  async upload(file) {
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) throw new Error('Bitte ein Bild (PNG, JPG, WebP, GIF, SVG) wählen.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Bild ist größer als 5 MB.');
    if (DEMO) return readFileAsDataUrl(file);
    const path = `${new Date().toISOString().slice(0, 7)}/${uid()}-${slugify(file.name.replace(/\.\w+$/, ''))}.${file.name.split('.').pop()}`;
    unwrap(await supabase.storage.from('media').upload(path, file, { contentType: file.type }));
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  },

  async settings() {
    if (DEMO) return load().settings || { auto_publish: false, min_relevance: 8, max_per_run: 1, byline: 'Redaktion L-mobile infrastructure' };
    return unwrap(await supabase.from('settings').select('*').eq('id', 1).single());
  },
  async saveSettings(s) {
    if (DEMO) { const db = load(); db.settings = s; save(db); return s; }
    const { id, updated_at, ...rest } = s;
    return unwrap(await supabase.from('settings').update({ ...rest, updated_at: now() }).eq('id', 1).select().single());
  },

  /* public site: published posts with author */
  async publishedPosts() {
    if (DEMO) { const db = load(); return db.posts.filter(p => p.status === 'published').map(p => ({ ...p, author: db.authors.find(a => a.id === p.author_id) })); }
    return unwrap(await supabase.from('posts').select('*, author:authors(name, role, avatar_url, bio)').eq('status', 'published').order('published_at', { ascending: false }));
  },
};

/** Current editor session (null when signed out or in demo mode). */
export function useCmsUser() {
  const [user, setUser] = useStateHook(null);
  useEffectHook(() => {
    if (DEMO) return;
    cms.session().then(setUser);
    return cms.onAuth(setUser);
  }, []);
  return user;
}
