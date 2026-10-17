import { useEffect, useRef, useState } from 'react';
import { cms, DEMO, slugify } from '../lib/cms';
import { mdToHtml } from '../lib/markdown';
import { byRoute, nav, navItems } from '../data/site';
import { news as staticNews } from '../data/news';

const SERVICE_OPTIONS = [
  ...nav.flatMap(n => (n.route ? [] : navItems(n))).filter(([, r]) => !r.startsWith('interaktiv/') && r !== 'ueber-uns/karriere'),
  ['Schnell-Check', 'schnell-check'], ['Phishing-Training', 'phishing-training'], ['Ausfallkosten-Rechner', 'ausfallkosten'],
];
const EMPTY = { title: '', slug: '', summary: '', body_md: '', tags: [], services: [], source: '', source_url: '', cover_url: '', status: 'draft' };
const TEMPLATE = '## Was ist passiert?\n\n\n\n## Unsere Einschätzung\n\n\n\n## Was Sie jetzt tun sollten\n\n- \n- \n- \n\n## So helfen wir\n\n';

/* ================= Login ================= */
function Login() {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('lmi-login-email') || ''; } catch { return ''; } });
  const [password, setPassword] = useState('');
  const [state, setState] = useState(null);
  const submit = async e => {
    e.preventDefault();
    setState('busy');
    try { localStorage.setItem('lmi-login-email', email); } catch { /* private mode */ }
    try { await cms.signIn(email, password); setState(null); } catch (err) { setState(err.message); }
  };
  return (
    <div className="cms-login">
      <h1>Redaktion</h1>
      <form onSubmit={submit} className="fields">
        <label className="fields__wide">E-Mail-Adresse<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="fields__wide">Passwort<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn" disabled={state === 'busy'}>Anmelden</button>
        {state && state !== 'busy' && <p className="cms-error" role="alert">{state}</p>}
        <p className="cms-hint fields__wide">Zugang nur für Redakteure. Konten werden im Supabase-Dashboard angelegt.</p>
      </form>
    </div>
  );
}

/* ================= Markdown editor with toolbar + live preview ================= */
const TOOLS = [
  ['H2', 'Überschrift (groß)', { line: '## ' }],
  ['H3', 'Zwischenüberschrift', { line: '### ' }],
  ['H4', 'Kleine Überschrift', { line: '#### ' }],
  ['B', 'Fett', { wrap: '**' }],
  ['I', 'Kursiv', { wrap: '*' }],
  ['•', 'Aufzählung', { line: '- ' }],
  ['1.', 'Nummerierte Liste', { line: '1. ' }],
  ['❝', 'Zitat', { line: '> ' }],
  ['Link', 'Link einfügen', { link: true }],
];

function MarkdownEditor({ value, onChange, onUpload }) {
  const ta = useRef(null);
  const [tab, setTab] = useState('split');

  const apply = ({ line, wrap, link }) => {
    const el = ta.current;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e);
    let next, cursor;
    if (wrap) {
      next = value.slice(0, s) + wrap + (sel || 'Text') + wrap + value.slice(e);
      cursor = [s + wrap.length, s + wrap.length + (sel || 'Text').length];
    } else if (link) {
      const url = prompt('Adresse (https://… oder /seite):', 'https://');
      if (!url) return;
      const md = `[${sel || 'Linktext'}](${url})`;
      next = value.slice(0, s) + md + value.slice(e);
      cursor = [s + 1, s + 1 + (sel || 'Linktext').length];
    } else {
      // Prefix every selected line (or the current line); toggling a heading replaces an existing one.
      const start = value.lastIndexOf('\n', s - 1) + 1;
      const block = value.slice(start, e).split('\n').map(l => line + l.replace(/^(#{1,4}\s|[-*]\s|\d+[.)]\s|>\s?)/, '')).join('\n');
      next = value.slice(0, start) + block + value.slice(e);
      cursor = [start + block.length, start + block.length];
    }
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(...cursor); });
  };

  const insertImage = async file => {
    if (!file) return;
    try {
      const url = await onUpload(file);
      const alt = prompt('Bildbeschreibung (für Barrierefreiheit und Google):', '') || '';
      const el = ta.current;
      const pos = el.selectionStart;
      onChange(value.slice(0, pos) + `\n\n![${alt}](${url})\n\n` + value.slice(pos));
    } catch (err) { alert(err.message); }
  };

  const onKey = e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); apply({ wrap: '**' }); }
    if (k === 'i') { e.preventDefault(); apply({ wrap: '*' }); }
    if (k === 'k') { e.preventDefault(); apply({ link: true }); }
  };

  return (
    <div className="mde">
      <div className="mde__bar" role="toolbar" aria-label="Formatierung">
        {TOOLS.map(([label, title, action]) => (
          <button type="button" key={title} title={title} aria-label={title} onClick={() => apply(action)} className={label === 'B' ? 'is-b' : label === 'I' ? 'is-i' : ''}>{label}</button>
        ))}
        <label className="mde__img" title="Bild hochladen">Bild<input type="file" accept="image/*" hidden onChange={e => { insertImage(e.target.files[0]); e.target.value = ''; }} /></label>
        <span className="mde__spacer" />
        {['write', 'split', 'preview'].map(t => (
          <button type="button" key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{{ write: 'Schreiben', split: 'Geteilt', preview: 'Vorschau' }[t]}</button>
        ))}
      </div>
      <div className={`mde__panes mde__panes--${tab}`}>
        {tab !== 'preview' && (
          <textarea ref={ta} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKey}
            onDrop={e => { if (e.dataTransfer.files[0]) { e.preventDefault(); insertImage(e.dataTransfer.files[0]); } }}
            spellCheck lang="de" aria-label="Beitragstext" placeholder="Text schreiben … (Strg+B fett, Strg+I kursiv, Strg+K Link, Bilder per Drag & Drop)" />
        )}
        {tab !== 'write' && <div className="mde__preview article__body" dangerouslySetInnerHTML={{ __html: mdToHtml(value) || '<p class="cms-hint">Vorschau erscheint hier.</p>' }} />}
      </div>
    </div>
  );
}

/* ================= Post editor ================= */
function PostEditor({ initial, author, onDone }) {
  const [p, setP] = useState(() => ({ ...EMPTY, body_md: TEMPLATE, ...initial }));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setP(s => ({ ...s, [k]: v }));
  const words = p.body_md.trim().split(/\s+/).filter(Boolean).length;

  const save = async status => {
    if (!p.title.trim()) return setMsg('Bitte einen Titel eingeben.');
    if (status === 'published' && p.summary.trim().length < 50) return setMsg('Bitte eine Zusammenfassung (min. 50 Zeichen) für Google eingeben.');
    setBusy(true);
    try {
      const saved = await cms.savePost({ ...p, status, author_id: p.author_id || author.id, slug: p.slug || slugify(p.title) });
      setP(saved);
      setMsg(status === 'published' ? 'Veröffentlicht.' : 'Entwurf gespeichert.');
    } catch (err) { setMsg(`Fehler: ${err.message}`); }
    setBusy(false);
  };

  return (
    <div className="cms-editor">
      <div className="cms-editor__main">
        <input className="cms-title" value={p.title} onChange={e => set('title', e.target.value)} placeholder="Titel – so formulieren, wie Leute danach googeln" aria-label="Titel" />
        <textarea className="cms-summary" value={p.summary} onChange={e => set('summary', e.target.value)} maxLength={300} rows={2}
          placeholder="Zusammenfassung für Google und Vorschau (ca. 120–160 Zeichen)" aria-label="Zusammenfassung" />
        <small className={`cms-hint${p.summary.length > 160 ? ' cms-warn' : ''}`}>{p.summary.length}/160 Zeichen empfohlen</small>
        <MarkdownEditor value={p.body_md} onChange={v => set('body_md', v)} onUpload={cms.upload} />
        <small className="cms-hint">{words} Wörter · ca. {Math.max(1, Math.round(words / 200))} Min. Lesezeit</small>
      </div>
      <aside className="cms-editor__side">
        <div className="cms-box">
          <strong>Status: {p.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}</strong>
          <div className="btn-row">
            <button className="btn btn--ghost btn--small" disabled={busy} onClick={() => save('draft')}>Entwurf speichern</button>
            <button className="btn btn--small" disabled={busy} onClick={() => save('published')}>{p.status === 'published' ? 'Aktualisieren' : 'Veröffentlichen'}</button>
          </div>
          {p.status === 'published' && <button className="cms-link" onClick={() => save('draft')}>Zurückziehen (wieder Entwurf)</button>}
          {msg && <p className="cms-msg" role="status">{msg}</p>}
        </div>
        <label className="cms-field">Adresse (URL)
          <span className="cms-url">/aktuelles/<input value={p.slug} onChange={e => set('slug', slugify(e.target.value))} placeholder={slugify(p.title) || 'wird-aus-titel-erzeugt'} /></span>
        </label>
        <label className="cms-field">Titelbild
          {p.cover_url && <img src={p.cover_url} alt="" className="cms-cover" />}
          <input type="file" accept="image/*" onChange={async e => { try { set('cover_url', await cms.upload(e.target.files[0])); } catch (err) { setMsg(err.message); } }} />
        </label>
        <label className="cms-field">Themen (Komma-getrennt)
          <input value={p.tags.join(', ')} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} placeholder="IT-Sicherheit, Phishing" />
        </label>
        <fieldset className="cms-field">
          <legend>„So helfen wir“-Buttons unter dem Beitrag</legend>
          <div className="cms-checks">
            {SERVICE_OPTIONS.map(([label, r]) => (
              <label key={r}><input type="checkbox" checked={p.services.includes(r)} onChange={e => set('services', e.target.checked ? [...p.services, r] : p.services.filter(x => x !== r))} /> {label}</label>
            ))}
          </div>
        </fieldset>
        <label className="cms-field">Quelle (Name)<input value={p.source} onChange={e => set('source', e.target.value)} placeholder="z. B. heise online, BSI" /></label>
        <label className="cms-field">Quelle (Link)<input type="url" value={p.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://…" /></label>
        <p className="cms-hint">Nachrichten immer in eigenen Worten wiedergeben und die Quelle verlinken – keine fremden Texte übernehmen.</p>
        <button className="cms-link" onClick={onDone}>← Zurück zur Übersicht</button>
      </aside>
    </div>
  );
}

/* ================= Suggestions (morning check) ================= */
function Suggestions({ onAdopt }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const load = () => cms.suggestions().then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const refresh = async () => { setErr(''); try { await cms.refreshSuggestions(); load(); } catch (e) { setErr(e.message); } };
  const dismiss = async id => { await cms.setSuggestion(id, 'dismissed'); load(); };
  if (!list) return <p>Lade Vorschläge …</p>;
  return (
    <div>
      <div className="cms-head">
        <p>Jeden Morgen um 7 Uhr werden die Quellen geprüft. Die KI bewertet die Relevanz für eure Kunden und schreibt einen eigenen Entwurf – du passt ihn nur noch an.</p>
        <button className="btn btn--ghost btn--small" onClick={refresh}>Jetzt neu prüfen</button>
      </div>
      {err && <p className="cms-error" role="alert">{err}</p>}
      {list.length === 0 && <p className="cms-hint">Keine neuen Vorschläge.</p>}
      <div className="cms-sugg">
        {list.map(s => (
          <article key={s.id} className="cms-sugg__item">
            <div className={`cms-score cms-score--${s.relevance >= 8 ? 'hi' : s.relevance >= 5 ? 'mid' : 'lo'}`} title="Relevanz für eure Kunden (1–10)">{s.relevance}</div>
            <div>
              <p className="cms-meta">{s.source} · {new Date(s.published_at || s.created_at).toLocaleDateString('de-DE')}</p>
              <h3>{s.title}</h3>
              <p>{s.teaser}</p>
              {s.reason && <p className="cms-reason"><strong>Warum relevant:</strong> {s.reason}</p>}
              <div className="btn-row">
                <button className="btn btn--small" onClick={() => onAdopt(s)}>Entwurf übernehmen</button>
                {s.url && <a className="btn btn--ghost btn--small" href={s.url} target="_blank" rel="noopener noreferrer">Originalmeldung</a>}
                <button className="cms-link" onClick={() => dismiss(s.id)}>Verwerfen</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ================= Post list ================= */
function Posts({ onEdit, onNew }) {
  const [list, setList] = useState(null);
  const load = () => cms.posts().then(setList);
  useEffect(() => { load(); }, []);
  if (!list) return <p>Lade Beiträge …</p>;
  return (
    <div>
      <div className="cms-head"><p>{list.length} Beiträge</p><button className="btn btn--small" onClick={onNew}>Neuer Beitrag</button></div>
      <table className="cms-table">
        <thead><tr><th>Titel</th><th>Status</th><th>Geändert</th><th /></tr></thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td><button className="cms-link" onClick={() => onEdit(p)}>{p.title || '(ohne Titel)'}</button></td>
              <td><span className={`cms-badge cms-badge--${p.status}`}>{p.status === 'published' ? 'Online' : 'Entwurf'}</span>{p.auto && <span className="cms-badge cms-badge--auto">automatisch</span>}</td>
              <td>{new Date(p.updated_at).toLocaleDateString('de-DE')}</td>
              <td className="cms-actions">
                {p.status === 'published' && <a href={`/aktuelles/${p.slug}`} target="_blank" rel="noreferrer">Ansehen</a>}
                <button className="cms-link cms-link--danger" onClick={async () => { if (confirm(`„${p.title}“ endgültig löschen?`)) { await cms.deletePost(p.id); load(); } }}>Löschen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= Author profile ================= */
function Profile({ author, onSaved }) {
  const [a, setA] = useState(author);
  const [msg, setMsg] = useState('');
  return (
    <form className="cms-profile" onSubmit={async e => { e.preventDefault(); try { onSaved(await cms.saveAuthor(a)); setMsg('Gespeichert.'); } catch (err) { setMsg(err.message); } }}>
      <div className="author-box">
        {a.avatar_url ? <img src={a.avatar_url} alt="" /> : <span className="author-box__ph">{a.name?.[0] || '?'}</span>}
        <div><strong>{a.name || 'Name'}</strong><span>{a.role || 'Rolle'}</span></div>
      </div>
      <p className="cms-hint">So erscheinst du unter deinen Beiträgen.</p>
      <div className="fields">
        <label>Name<input required value={a.name} onChange={e => setA({ ...a, name: e.target.value })} /></label>
        <label>Rolle / Funktion<input value={a.role} onChange={e => setA({ ...a, role: e.target.value })} placeholder="z. B. IT-Security Consultant" /></label>
        <label className="fields__wide">Kurz-Bio<textarea rows="3" value={a.bio || ''} onChange={e => setA({ ...a, bio: e.target.value })} /></label>
        <label className="fields__wide">Profilbild<input type="file" accept="image/*" onChange={async e => { try { setA({ ...a, avatar_url: await cms.upload(e.target.files[0]) }); } catch (err) { setMsg(err.message); } }} /></label>
      </div>
      <button className="btn">Profil speichern</button>
      {msg && <p className="cms-msg" role="status">{msg}</p>}
    </form>
  );
}

/* ================= Automatik (auto-publish settings) ================= */
function Automatik() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { cms.settings().then(setS).catch(e => setMsg(e.message)); }, []);
  if (!s) return <p>{msg || 'Lade Einstellungen …'}</p>;
  const save = async next => {
    setS(next);
    try { setS(await cms.saveSettings(next)); setMsg('Gespeichert.'); } catch (e) { setMsg(`Fehler: ${e.message}`); }
  };
  return (
    <div className="cms-auto">
      <div className={`cms-auto__switch${s.auto_publish ? ' is-on' : ''}`}>
        <div>
          <h2>Automatisch veröffentlichen</h2>
          <p>Jeden Morgen prüft das System die Quellen, schreibt eigene Beiträge, verweist auf passende Leistungen und wählt die Buttons selbst. Ist die Automatik an, werden die besten Beiträge ohne Freigabe veröffentlicht.</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={s.auto_publish} onChange={e => save({ ...s, auto_publish: e.target.checked })} />
          <span aria-hidden="true" /> {s.auto_publish ? 'An' : 'Aus'}
        </label>
      </div>
      <div className="fields">
        <label>Mindest-Relevanz (1–10)
          <input type="number" min="1" max="10" value={s.min_relevance} onChange={e => setS({ ...s, min_relevance: Math.min(10, Math.max(1, +e.target.value || 8)) })} onBlur={() => save(s)} />
        </label>
        <label>Max. Beiträge pro Tag
          <input type="number" min="0" max="5" value={s.max_per_run} onChange={e => setS({ ...s, max_per_run: Math.min(5, Math.max(0, +e.target.value || 0)) })} onBlur={() => save(s)} />
        </label>
        <label className="fields__wide">Autorenzeile automatischer Beiträge
          <input value={s.byline} onChange={e => setS({ ...s, byline: e.target.value })} onBlur={() => save(s)} />
        </label>
      </div>
      <h3>Diese Sicherungen greifen immer</h3>
      <ul className="list">
        <li className="check check--check">Nur Beiträge ab der Mindest-Relevanz und höchstens {s.max_per_run} pro Tag.</li>
        <li className="check check--check">Pflichtaufbau: alle vier Abschnitte, mindestens 200 Wörter, Titel und Zusammenfassung.</li>
        <li className="check check--check">Mindestens ein Link auf eine eigene Leistung – sonst keine Veröffentlichung.</li>
        <li className="check check--check">Kopierschutz: Enthält der Text 8 aufeinanderfolgende Wörter aus der Quelle, wird er nicht veröffentlicht.</li>
        <li className="check check--check">Automatische Beiträge sind als „KI-gestützt erstellt“ gekennzeichnet und unter „Beiträge“ markiert – jederzeit zurückziehbar.</li>
      </ul>
      {msg && <p className="cms-msg" role="status">{msg}</p>}
    </div>
  );
}

/* ================= Shell ================= */
export default function Redaktion() {
  const [user, setUser] = useState(undefined);
  const [author, setAuthor] = useState(null);
  const [view, setView] = useState('suggestions');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    cms.session().then(setUser);
    return cms.onAuth(setUser);
  }, []);
  useEffect(() => { if (user) cms.myAuthor(user).then(setAuthor); }, [user]);

  // Deep link from a post's "Beitrag bearbeiten" button.
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get('bearbeiten');
    if (!user || !slug) return;
    cms.posts().then(list => {
      const hit = list.find(p => p.slug === slug);
      const st = staticNews.find(p => p.slug === slug);
      if (hit) setEditing(hit);
      else if (st) setEditing({ title: st.title, slug: st.slug, summary: st.summary || '', body_md: st.body_md.trim(), tags: st.tags, services: st.services, source: st.source || '', source_url: st.sourceUrl || '', status: 'draft' });
      history.replaceState(null, '', '/redaktion');
    });
  }, [user]);

  const adopt = async s => {
    await cms.setSuggestion(s.id, 'used');
    setEditing({ title: s.draft_title || s.title, summary: s.draft_summary || '', body_md: s.draft_body_md || TEMPLATE, tags: s.tags || [], services: s.services || [], source: s.source, source_url: s.url, status: 'draft' });
  };

  let body;
  if (user === undefined) body = <p>Lade …</p>;
  else if (!user) body = <Login />;
  else if (!author) body = <p>Lade Profil …</p>;
  else if (editing) body = <PostEditor key={editing.id || 'new'} initial={editing} author={author} onDone={() => { setEditing(null); setView('posts'); }} />;
  else body = (
    <>
      <nav className="cms-tabs" aria-label="Redaktion">
        {[['suggestions', 'Vorschläge'], ['posts', 'Beiträge'], ['auto', 'Automatik'], ['profile', 'Mein Profil']].map(([k, l]) => (
          <button key={k} aria-current={view === k || undefined} onClick={() => setView(k)}>{l}</button>
        ))}
        <span className="mde__spacer" />
        <span className="cms-hint">{author.name}</span>
        {!DEMO && <button className="cms-link" onClick={() => cms.signOut()}>Abmelden</button>}
      </nav>
      {view === 'suggestions' && <Suggestions onAdopt={adopt} />}
      {view === 'posts' && <Posts onEdit={setEditing} onNew={() => setEditing({})} />}
      {view === 'auto' && <Automatik />}
      {view === 'profile' && <Profile author={author} onSaved={setAuthor} />}
    </>
  );

  return (
    <section className="cms">
      {DEMO && <p className="cms-demo" role="note"><strong>Demo-Modus:</strong> Supabase ist noch nicht verbunden. Alles wird nur in diesem Browser gespeichert. Vorschläge sind Beispiele.</p>}
      {body}
    </section>
  );
}

export { byRoute };
