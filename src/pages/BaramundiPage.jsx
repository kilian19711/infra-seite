import { byRoute } from '../data/site';
import { Breadcrumbs } from '../components/Wayfinding';
import ContactBox from '../components/ContactBox';
import Scene3D from '../components/Scene3D';

/*
 * Compact rebuild of the baramundi / Desktop-Management page. Copy is condensed from the existing page;
 * the FAQ answers are taken from the crawled page content (pages.json) so they stay the company's own text.
 */
const ROUTE = 'softwareloesungen/desktop-management-software';
const blocks = byRoute[ROUTE]?.blocks || [];
const faqStart = blocks.findIndex(b => b.t === 'h2' && /^FAQ/.test(b.text));
const FAQ = faqStart < 0 ? [] : blocks.slice(faqStart + 1).reduce((acc, b) => {
  if (b.t === 'h3') acc.push({ q: b.text, a: [] });
  else if (b.t === 'p' && acc.length) acc.at(-1).a.push(b.text);
  return acc;
}, []);
const QUOTE = blocks.find(b => b.t === 'p' && b.text.startsWith('„Eine von Anfang bis Ende'))?.text;

const FEATURES = [
  ['Inventarisierung & Lizenzen', 'Alle Hard- und Software automatisch erfasst – ungenutzte Lizenzen werden sichtbar.'],
  ['Softwareverteilung', 'Programme, Updates und Konfigurationen zentral auf alle Geräte verteilen statt von Hand.'],
  ['Patch- & Update-Management', 'Sicherheitsupdates automatisch und geprüft einspielen – Lücken schneller schließen.'],
  ['Schwachstellen & Verschlüsselung', 'Automatische Schwachstellenscans, BitLocker-Steuerung und Geräteschutz.'],
  ['Mobile Geräte', 'Smartphones und Tablets im selben System verwalten wie PCs und Notebooks.'],
  ['Backup & Wiederherstellung', 'Benutzerdaten und Laufwerke sichern – schnell zurück nach Defekt oder Angriff.'],
];
const STEPS = [
  ['Live-Demo', 'Wir zeigen die Suite an Ihren Anforderungen und klären alle Fragen.'],
  ['Installation', 'Einrichtung inklusive Testversion per Fernzugriff – schnell und unkompliziert.'],
  ['Schulung', 'Ihr Team lernt die Verwaltung im Alltag – so viel wie nötig, so wenig wie möglich.'],
  ['Betreuung', 'Updates, Weiterentwicklung und ein fester technischer Ansprechpartner.'],
];
const COMPARE = [
  ['Updates und Patches werden Gerät für Gerät eingespielt', 'Updates laufen zentral, geplant und automatisch auf alle Geräte'],
  ['Niemand weiß genau, welche Software wo installiert ist', 'Vollständige Übersicht über Hard- und Software inklusive Lizenzen'],
  ['Sicherheitslücken bleiben oft wochenlang offen', 'Schwachstellen werden erkannt und gezielt geschlossen'],
  ['Neue Arbeitsplätze einzurichten dauert Stunden', 'Neue Geräte sind in kurzer Zeit einheitlich startklar'],
  ['Mobile Geräte laufen nebenher und unkontrolliert', 'PCs, Notebooks und mobile Geräte in einer Oberfläche'],
];
const BENEFITS = ['Windows, macOS, iOS & Android in einer Oberfläche', 'Weniger Ausfallzeiten', 'Mehr IT-Sicherheit', 'Zeit- und Kostenersparnis', 'Modular & erweiterbar', 'Lizenz pro verwaltetem Gerät'];

export default function BaramundiPage() {
  return (
    <>
      <section className="page-hero">
        <Scene3D variant="globe" />
        <div className="page-hero__text">
          <Breadcrumbs route={ROUTE} title="Desktop Management (baramundi)" />
          <p className="eyebrow">Alle Endpoints im Griff – immer und überall</p>
          <h1 className="page-hero__title">Desktop Management mit der baramundi Management Suite</h1>
          <p className="page-hero__lead">Updates, Software, Sicherheit und Inventar aller Geräte zentral und automatisiert verwalten – statt jeden Client einzeln von Hand zu betreuen. Wir führen die Suite bei Ihnen ein und betreuen sie dauerhaft.</p>
          <div className="page-hero__cta">
            <a className="btn" href="/baramundi-rechner">Ersparnis berechnen</a>
            <a className="btn btn--ghost" href="/software-demo/baramundi-kostenlose-30-tage-testversion">30 Tage kostenlos testen</a>
            <a className="btn btn--ghost" href="/software-demo/unified-endpoint-management-mit-baramundi">Demo ansehen</a>
          </div>
        </div>
        <figure className="page-hero__img"><img src="/img/2025-04-geraete-mit-baramundi-software-schatten.png" alt="Geräte mit der baramundi Management Suite" /></figure>
      </section>

      <section className="section"><ContactBox route={ROUTE} /></section>

      <section className="section">
        <div className="section__head">
          <p className="eyebrow">Funktionen</p>
          <h2 className="reveal">Was die baramundi Management Suite für Sie übernimmt</h2>
        </div>
        <div className="grid grid--cards stagger bm-features">
          {FEATURES.map(([t, d]) => <article key={t} className="tool-card"><h3>{t}</h3><p>{d}</p></article>)}
        </div>
        <ul className="bm-benefits">{BENEFITS.map(b => <li key={b} className="check check--check">{b}</li>)}</ul>
      </section>

      <section className="section">
        <div className="section__head">
          <p className="eyebrow">Der Unterschied im Alltag</p>
          <h2 className="reveal">Client Management von Hand – oder automatisiert</h2>
        </div>
        <div className="bm-compare stagger">
          <div className="bm-compare__col">
            <h3>Ohne zentrale Verwaltung</h3>
            <ul>{COMPARE.map(([before]) => <li key={before} className="check check--cancel">{before}</li>)}</ul>
          </div>
          <div className="bm-compare__col bm-compare__col--good">
            <h3>Mit baramundi und L-mobile infrastructure</h3>
            <ul>{COMPARE.map(([, after]) => <li key={after} className="check check--check">{after}</li>)}</ul>
          </div>
        </div>
      </section>
      <section className="section section--alt">
        <div className="section__head">
          <p className="eyebrow">So unterstützen wir Sie</p>
          <h2 className="reveal">Von der Demo bis zum laufenden Betrieb</h2>
        </div>
        <ol className="steps stagger">{STEPS.map(([t, d]) => <li key={t}><strong>{t}</strong><p>{d}</p></li>)}</ol>
      </section>

      {QUOTE && (
        <section className="section bm-case">
          <img src="/img/2026-03-zagro-240x100-1.jpg" alt="ZAGRO Bahn- und Baumaschinen GmbH" loading="lazy" />
          <blockquote>{QUOTE}</blockquote>
          <div className="btn-row">
            <a className="btn btn--ghost" href="/referenz/referenzkunde-zagro-bahn-und-baumaschinen-gmbh">Case Study ZAGRO lesen</a>
            <a className="btn btn--ghost" href="/whitepaper/baramundi-desktop-management-software-mit-l-mobile">Broschüre ansehen</a>
          </div>
        </section>
      )}

      {FAQ.length > 0 && (
        <section className="section">
          <div className="section__head"><p className="eyebrow">FAQ</p><h2>Häufige Fragen zu baramundi</h2></div>
          <div className="faq">
            {FAQ.map(f => (
              <details key={f.q}><summary>{f.q}</summary>{f.a.map((p, i) => <p key={i}>{p}</p>)}</details>
            ))}
          </div>
        </section>
      )}

      <section className="section cta reveal">
        <h2>Wie viel Zeit kostet Sie Ihr Client Management heute?</h2>
        <p>In einer Minute ausgerechnet – oder direkt mit Luca Layher besprechen.</p>
        <div className="btn-row" style={{ justifyContent: 'center' }}><a className="btn" href="/baramundi-rechner">Ersparnis berechnen</a><a className="btn btn--ghost" href="/termin">Termin vereinbaren</a></div>
      </section>
    </>
  );
}
