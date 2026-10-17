import { useState } from 'react';
import { useNews, fmtDate } from '../data/news';
import { byRoute } from '../data/site';
import { Breadcrumbs } from '../components/Wayfinding';
import { useCmsUser } from '../lib/cms';

const labelFor = r => ({ 'schnell-check': 'Schnell-Check IT-Sicherheit', ausfallkosten: 'Ausfallkosten-Rechner', 'phishing-training': 'Phishing-Training' }[r] || byRoute[r]?.title || r);

export function AuthorBox({ author }) {
  if (!author?.name) return null;
  return (
    <div className="author-box">
      {author.avatar_url ? <img src={author.avatar_url} alt="" /> : <span className="author-box__ph">{author.name[0]}</span>}
      <div><strong>{author.name}</strong>{author.role && <span>{author.role}</span>}</div>
    </div>
  );
}

function EditorLogin() {
  const editor = useCmsUser();
  return (
    <a href="/redaktion" className={`news-login${editor ? ' is-in' : ''}`} title={editor ? `Angemeldet als ${editor.email}` : 'Login für Redakteure'}>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z" /></svg>
      {editor ? 'Redaktion öffnen' : 'Login'}
    </a>
  );
}

export function NewsList() {
  const news = useNews();
  const tags = [...new Set(news.flatMap(p => p.tags))].sort();
  const [tag, setTag] = useState(null);
  const shown = tag ? news.filter(p => p.tags.includes(tag)) : news;
  return (
    <>
      <section className="page-hero page-hero--short">
        <div className="page-hero__text">
          <Breadcrumbs route="aktuelles" title="Aktuelles" />
          <p className="eyebrow">Aktuelles & Einschätzungen</p>
          <h1 className="page-hero__title">IT-Sicherheit aktuell: Was passiert – und was Sie tun sollten.</h1>
          <p className="page-hero__lead">Wir ordnen aktuelle Meldungen zu Cyberangriffen, Sicherheitslücken und IT-Themen ein – verständlich, mit konkreten Handlungsempfehlungen für Unternehmen, Schulen und Gemeinden.</p>
        </div>
      </section>
      <section className="section news">
        <EditorLogin />
        {tags.length > 0 && (
          <div className="chips news__filter" role="group" aria-label="Nach Thema filtern">
            <button className="chip" aria-pressed={!tag} onClick={() => setTag(null)}>Alle</button>
            {tags.map(t => <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(t)}>{t}</button>)}
          </div>
        )}
        {shown.length === 0 && <p>Noch keine Beiträge veröffentlicht.</p>}
        <div className="news__list">
          {shown.map(p => (
            <a key={p.slug} className="news__item" href={`/aktuelles/${p.slug}`}>
              <time dateTime={p.date}>{fmtDate(p.date)}</time>
              {p.draft && <span className="news__draft">Entwurf</span>}
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
              <span className="news__tags">{p.tags.join(' · ')}</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export function NewsPost({ slug }) {
  const news = useNews();
  const editor = useCmsUser();
  const p = news.find(n => n.slug === slug);
  if (!p) return <section className="section page-hero"><h1>Beitrag nicht gefunden</h1><a className="btn" href="/aktuelles">Alle Beiträge</a></section>;
  const related = news.filter(o => o.slug !== slug && o.tags.some(t => p.tags.includes(t))).slice(0, 3);
  return (
    <>
      {editor && p && (
        <div className="edit-bar" role="region" aria-label="Redaktion">
          <span>{p.static ? 'Dateibeitrag – beim Bearbeiten wird er ins Redaktionssystem übernommen.' : 'Redaktionsmodus'}</span>
          <a className="btn btn--small" href={`/redaktion?bearbeiten=${p.slug}`}>Beitrag bearbeiten</a>
        </div>
      )}
      <article className="section article">
        <Breadcrumbs route="aktuelles/x" title={p.title.length > 50 ? p.title.slice(0, 48) + '…' : p.title} />
        {p.draft && <p className="news__draft">Entwurf – nur lokal sichtbar, nicht veröffentlicht</p>}
        <p className="eyebrow">{p.tags.join(' · ')}</p>
        <h1>{p.title}</h1>
        <AuthorBox author={p.author} />
        <p className="article__meta">
          <time dateTime={p.date}>{fmtDate(p.date)}</time>
          {p.source && <> · Quelle: {p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{p.source}</a> : p.source}</>}
        </p>
        <p className="article__lead">{p.summary}</p>
        {p.auto && <p className="article__ai">KI-gestützt erstellt auf Basis der verlinkten Quelle und von unserer Redaktion veröffentlicht. Bitte prüfen Sie Details in der Originalmeldung.</p>}
        {p.cover && <img className="article__cover" src={p.cover} alt="" />}
        <div className="article__body" dangerouslySetInnerHTML={{ __html: p.html }} />
        {p.author?.name && (
          <div className="article__author">
            <AuthorBox author={p.author} />
            {p.author.bio && <p>{p.author.bio}</p>}
          </div>
        )}
        {p.services.length > 0 && (
          <aside className="article__help" aria-label="So helfen wir">
            <h2>Trifft das auf Sie zu? So helfen wir</h2>
            <div className="related__grid">
              {p.services.map(r => <a key={r} className="related__item" href={`/${r}`}>{labelFor(r)}</a>)}
            </div>
          </aside>
        )}
        <div className="article__cta">
          <h2>Ist Ihr Unternehmen betroffen?</h2>
          <p>Wir prüfen kurzfristig, ob und wie Sie geschützt sind – kostenloses Erstgespräch.</p>
          <div className="btn-row"><a className="btn" href="/termin">Termin vereinbaren</a><a className="btn btn--ghost" href="/schnell-check">Schnell-Check starten</a></div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="section related">
          <h2 className="related__title">Weitere Beiträge zum Thema</h2>
          <div className="related__grid">{related.map(o => <a key={o.slug} className="related__item" href={`/aktuelles/${o.slug}`}>{o.title}</a>)}</div>
        </section>
      )}
    </>
  );
}
