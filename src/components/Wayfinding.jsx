import { useEffect, useState } from 'react';
import { locate } from '../data/site';

export function Breadcrumbs({ route, title }) {
  const { trail } = locate(route);
  return (
    <nav className="crumbs" aria-label="Brotkrumen">
      <a href="/">Start</a>
      {trail.map(([label, r]) => (r ? <a key={label} href={`/${r}`}>{label}</a> : <span key={label}>{label}</span>))}
      <span aria-current="page">{title}</span>
    </nav>
  );
}

/** Sticky in-page navigation; buttons scroll smoothly without touching the URL. */
export function OnThisPage({ sections }) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  if (sections.length < 3) return null;
  return (
    <nav className="onpage" aria-label="Auf dieser Seite">
      <span className="onpage__label">Auf dieser Seite</span>
      <div className="onpage__items">
        {sections.map(s => (
          <button key={s.id} aria-current={active === s.id || undefined}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Related({ route }) {
  const { siblings, area } = locate(route);
  if (!siblings.length) return null;
  return (
    <section className="section related" aria-labelledby="related-h">
      <h2 id="related-h" className="related__title">Weitere Themen{area ? ` in „${area}“` : ''}</h2>
      <div className="related__grid">
        {siblings.map(([label, r]) => (
          <a key={r} href={`/${r}`} className="related__item">{label}</a>
        ))}
      </div>
    </section>
  );
}

const NEEDS = [
  ['Mein Unternehmen absichern', 'Cybersecurity-Check, Firewall, Backup und Awareness.', 'it-sicherheit'],
  ['IT auslagern & betreuen lassen', 'Managed Services mit festem Ansprechpartner.', 'it-infrastruktur/managed-services'],
  ['Netzwerk, Server oder Telefonie', 'Planung, Installation und Betrieb Ihrer Infrastruktur.', 'it-infrastruktur'],
  ['Schule oder Gemeinde digitalisieren', 'Digitalpakt 2.0, Schulnetz und Fördermittel.', 'digitalisierung-von-schulen'],
];

export function Needs() {
  return (
    <section className="section needs" aria-labelledby="needs-h">
      <div className="section__head">
        <p className="eyebrow">Schnelleinstieg</p>
        <h2 id="needs-h">Wobei dürfen wir Sie unterstützen?</h2>
      </div>
      <div className="needs__grid stagger">
        {NEEDS.map(([title, text, r]) => (
          <a key={r} href={`/${r}`} className="needs__item">
            <strong>{title}</strong>
            <span>{text}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
