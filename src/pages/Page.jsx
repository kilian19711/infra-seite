import SplitText from '../components/SplitText';
import SpotlightCard from '../components/SpotlightCard';
import Scene3D from '../components/Scene3D';
import AnimatedLogo from '../components/AnimatedLogo';
import { Breadcrumbs, OnThisPage, Related, Needs } from '../components/Wayfinding';
import RegionMap from '../components/RegionMap';
import ContactForm from '../components/ContactForm';
import ContactBox from '../components/ContactBox';
import ProfileStudioCard from '../components/ProfileStudioCard';
import { PartnerStrip, TrustStats, CustomerBelt, IntroSteps, ToolTeasers, BlogTeasers } from './HomeSections';
import { contactFor } from '../data/site';

export const variantFor = route =>
  /sicherheit|sophos|cyber|schwachstell/.test(route) ? 'core' : /infrastruktur|server|netzwerk|wlan|montage|managed/.test(route) ? 'lattice' : 'globe';

// Home portfolio: the four service areas (same structure as the "Leistungen" menu), each with its key services.
const AREAS = [
  ['IT-Sicherheit', 'it-sicherheit', '2025-05-sophos-firewall-it-sicherheit.jpg', 'Firewall, Endpoint, Backup und Awareness – in 18 Tagen IT-sicher mit der OZELOT-Methode.',
    [['Cybersecurity-Check', 'schnell-check'], ['Managed Services', 'it-infrastruktur/managed-services']]],
  ['IT-Infrastruktur', 'it-infrastruktur', '2025-05-server-einrichtung-it-experte.jpg', 'Netzwerk, Server, WLAN und Telefonie – geplant, installiert und betreut.',
    [['Netzwerk', 'it-infrastruktur/netzwerkloesungen'], ['Server', 'it-infrastruktur/serverloesungen'], ['WLAN', 'it-infrastruktur/wlan-loesungen'], ['VoIP-Telefonie', 'it-infrastruktur/voip-telefonie']]],
  ['Softwarelösungen', 'softwareloesungen', '2025-05-mitarbeiterin-bei-arbeit-mit-elo.jpg', 'Endgeräte, Dokumente und Cloud-Arbeitsplatz – automatisiert und sicher.',
    [['Desktop Management (baramundi)', 'softwareloesungen/desktop-management-software'], ['Dokumentenmanagement (ELO)', 'softwareloesungen/dokumenten-management-systeme'], ['Microsoft 365 & Azure', 'softwareloesungen/microsoft-365-azure'], ['ProfileStudio', 'softwareloesungen/profilestudio']]],
  ['Schulen & Gemeinden', 'digitalisierung-von-schulen', '2025-04-digitalpakt-schule-hardware-schueler.jpg', 'Digitalpakt 2.0 – vom Förderantrag bis zum eingerichteten Tablet.',
    [['Digitalpakt 2.0', 'digitalisierung-von-schulen'], ['LogoDIDACT-Alternative', 'logodidact-alternative-schulnetzverwalter-und-timago-imageverwaltung']]],
];

/* Home "Leistungsportfolio": four area tiles with image, short text and direct links to the individual services. */
function Services() {
  return (
    <section className="section section--alt portfolio" aria-labelledby="portfolio-h">
      <div className="section__head">
        <p className="eyebrow">Leistungsportfolio</p>
        <h2 id="portfolio-h">Alles, was Ihre IT braucht.</h2>
        <p>Vier Bereiche, ein Ansprechpartner – wählen Sie Ihr Thema.</p>
      </div>
      <div className="areas stagger">
        {AREAS.map(([title, route, img, text, links]) => (
          <article key={route} className="area">
            <a className="area__media" href={`/${route}`} tabIndex={-1} aria-hidden="true"><img src={`/img/${img}`} alt="" loading="lazy" /></a>
            <div className="area__body">
              <h3><a href={`/${route}`}>{title}</a></h3>
              <p>{text}</p>
              <ul>{links.map(([t, r]) => <li key={r}><a href={`/${r}`}>{t}</a></li>)}</ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const PROSE = ['impressum', 'datenschutzinformation'];

/* Home: merge "Herausforderungen" + "Vorteile" into one before/after block, drop the competitor column of
   "Unser Vorgehen im Vergleich" (keeping our own checklist) and add the OZELOT-Test button. */
function homeBlocks(blocks) {
  const at = re => blocks.findIndex(b => re.test(b.text || ''));
  const ch = at(/^Die Herausforderungen ohne/), adv = at(/^Ihre Vorteile in der Zusammenarbeit/), svc = at(/^Unsere Leistungen$/);
  const vg = at(/^Unser Vorgehen im Vergleich/), own = at(/^IT-Systemhaus L-mobile Infrastructure$/);
  if ([ch, adv, svc, vg, own].includes(-1)) return blocks;
  const cons = blocks.slice(ch + 1, adv).filter(b => b.t === 'li');
  const pros = [];
  blocks.slice(adv + 1, svc).forEach(b => b.t === 'h4' ? pros.push({ title: b.text, text: '' }) : b.t === 'p' && pros.length && (pros.at(-1).text = b.text));
  return [
    ...blocks.slice(0, ch),
    { t: 'h3', text: 'Ohne Partner im Risiko – mit uns auf der sicheren Seite' },
    { t: 'compare', cons, pros },
    ...blocks.slice(svc, vg),
    { t: 'btn', text: 'OZELOT-Test: Wie sicher sind Sie?', href: '/schnell-check' },
    { t: 'h3', text: 'Warum L-mobile infrastructure' },
    ...blocks.slice(own + 1),
  ];
}
const isQuote = b => b.t === 'p' && /^[„"“]/.test(b.text);
const isHeading = b => b && (b.t === 'h2' || b.t === 'h3');
const statMatch = t => t.match(/^(\d+)(\+?)$/);

/**
 * Turns the flat block list scraped from WordPress into sections:
 * hero (everything before the first h2/h3), then one section per h2/h3 with grouped children:
 * runs of <li> → list, img+h4+p → card, numeric h4 → stat, ≥3 images in a row → logo marquee.
 */
function structure(blocks) {
  const first = blocks.findIndex((b, i) => i > 0 && isHeading(b));
  const heroEnd = first === -1 ? blocks.length : first;
  const hero = blocks.slice(0, heroEnd);
  const sections = [];
  let sec = null;
  const push = item => {
    if (!sec) sections.push((sec = { items: [] }));
    const last = sec.items.at(-1);
    if (last && last.t === item.t && ['list', 'cards', 'stats', 'logos', 'btns'].includes(item.t)) last.items.push(...item.items);
    else sec.items.push(item);
  };

  for (let i = heroEnd; i < blocks.length; i++) {
    const b = blocks[i], next = blocks[i + 1];
    // Short paragraph right before a heading = eyebrow/kicker.
    if (b.t === 'p' && b.text.length < 70 && isHeading(next)) { sections.push((sec = { eyebrow: b.text, items: [] })); continue; }
    if (isHeading(b)) {
      if (sec && !sec.heading && !sec.items.length) Object.assign(sec, { heading: b.text, level: b.t });
      else sections.push((sec = { heading: b.text, level: b.t, items: [] }));
      continue;
    }
    if (b.t === 'h4' || (b.t === 'img' && next?.t === 'h4')) {
      const img = b.t === 'img' ? b : null;
      const h = img ? next : b;
      i += img ? 1 : 0;
      const stat = statMatch(h.text);
      const body = [], btns = [];
      while (blocks[i + 1] && ['p', 'btn'].includes(blocks[i + 1].t) && !isHeading(blocks[i + 2]) && !(blocks[i + 1].t === 'p' && body.length && stat)) {
        const n = blocks[++i];
        (n.t === 'btn' ? btns : body).push(n);
        if (stat) break;
      }
      if (stat) push({ t: 'stats', items: [{ value: +stat[1], suffix: stat[2], label: body[0]?.text || '' }] });
      else push({ t: 'cards', items: [{ title: h.text, img, body, btns }] });
      continue;
    }
    if (b.t === 'li' || b.t === 'h1') { push({ t: 'list', items: [b] }); continue; }
    // A lone logo right before a heading belongs to that heading's section (e.g. the KLAFS case study).
    if (b.t === 'img' && /logo|240x100/.test(b.src) && isHeading(next)) {
      sections.push((sec = { heading: next.text, level: next.t, items: [{ t: 'img', ...b }] }));
      i++;
      continue;
    }
    if (b.t === 'img') {
      let j = i;
      while (blocks[j + 1]?.t === 'img') j++;
      if (j - i >= 2) { push({ t: 'logos', items: blocks.slice(i, j + 1) }); i = j; }
      else push({ t: 'img', ...b });
      continue;
    }
    if (b.t === 'btn') { push({ t: 'btns', items: [b] }); continue; }
    if (b.t === 'compare') { push(b); continue; }
    push(isQuote(b) ? { t: 'quote', text: b.text } : { t: 'p', text: b.text });
  }
  return { hero, sections };
}

const Btn = ({ b, ghost }) => (
  <a className={`btn${ghost ? ' btn--ghost' : ''}`} href={b.href || '/kontakt'} {...(b.href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{b.text}</a>
);

function Hero({ page, blocks }) {
  const h1 = blocks.find(b => b.t === 'h1') || { text: page.title };
  const idx = blocks.indexOf(h1);
  const eyebrow = blocks.slice(0, Math.max(idx, 0)).find(b => b.t === 'p');
  const img = blocks.find(b => b.t === 'img');
  const rest = blocks.filter(b => b !== h1 && b !== eyebrow && b !== img);
  const btns = rest.filter(b => b.t === 'btn');
  const checks = rest.filter(b => b.t === 'li');
  const text = rest.filter(b => b.t === 'p' || b.t === 'h2' || b.t === 'h3');
  return (
    <section className="page-hero">
      {page.route !== '' && <Scene3D variant={variantFor(page.route)} />}
      <div className="hud" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="page-hero__text">
        {page.route && <Breadcrumbs route={page.route} title={h1.text.length > 48 ? page.title : h1.text} />}
        <p className="eyebrow">{eyebrow?.text || page.title}</p>
        <SplitText tag="h1" text={h1.text} className="page-hero__title" splitType="words" delay={40} textAlign="left" threshold={0} rootMargin="0px" />
        {(text.length ? text : page.description ? [{ text: page.description }] : []).map((b, i) => <p className="page-hero__lead" key={i}>{b.text}</p>)}
        {checks.length > 0 && <ul className="checks">{checks.map((c, i) => <li key={i} className={`check check--${c.icon || 'check'}`}>{c.text}</li>)}</ul>}
        <div className="page-hero__cta">
          {btns.map((b, i) => <Btn key={i} b={b} ghost={i > 0} />)}
          {!btns.length && page.route === 'kontakt' && <><a className="btn" href="#anfrage">Anfrage schreiben</a><a className="btn btn--ghost" href="#termin">Termin buchen</a></>}
          {!btns.length && page.route !== 'kontakt' && <a className="btn" href="/termin">Beratung vereinbaren</a>}
          {page.route === '' && <a className="btn btn--ghost" href="/schnell-check">OZELOT-Test: Wie sicher sind Sie?</a>}
        </div>
      </div>
      {img && <figure className="page-hero__img"><img src={page.route === '' ? "/img/2026-10-infra-team-hq.jpg" : img.src} alt={img.alt} /></figure>}
      <div className="scroll-hint" aria-hidden="true">Scroll</div>
    </section>
  );
}

// Small customer/partner logos (240x100) must not be blown up to photo size.
const LOGO = /logo|240x100/;

function Item({ it }) {
  switch (it.t) {
    case 'p': return <p className="reveal prose-p">{it.text}</p>;
    case 'quote': return <blockquote className="quote reveal">{it.text}</blockquote>;
    case 'img': return LOGO.test(it.src)
      ? <figure className="figure--logo reveal"><img src={it.src} alt={it.alt} loading="lazy" /></figure>
      : <figure className="figure img-reveal parallax"><img src={it.src} alt={it.alt} loading="lazy" /></figure>;
    case 'compare': return (
      <div className="bm-compare stagger">
        <div className="bm-compare__col">
          <h3>Ohne L-mobile infrastructure</h3>
          <ul>{it.cons.map(c => <li key={c.text} className="check check--cancel">{c.text}</li>)}</ul>
        </div>
        <div className="bm-compare__col bm-compare__col--good">
          <h3>Mit L-mobile infrastructure</h3>
          <ul>{it.pros.map(p => <li key={p.title} className="check check--check"><strong>{p.title}</strong><br />{p.text}</li>)}</ul>
        </div>
      </div>
    );
    case 'btns': return <div className="btn-row reveal">{it.items.map((b, i) => <Btn key={i} b={b} ghost={i > 0} />)}</div>;
    case 'list': return (
      <ul className={`list stagger${it.items.length > 3 ? ' list--grid' : ''}`}>
        {it.items.map((li, i) => <li key={i} className={`check check--${li.icon || (li.t === 'h1' ? 'none' : 'dot')}`}>{li.text}</li>)}
      </ul>
    );
    case 'stats': return (
      <div className="stats stats--inline stagger">
        {it.items.map((s, i) => <div className="stat" key={i}><strong data-count={s.value} data-suffix={s.suffix}>{s.value}{s.suffix}</strong><span>{s.label}</span></div>)}
      </div>
    );
    case 'logos': return (
      <div className="marquee" aria-label="Partner und Kunden">
        <div className="marquee__track">
          {[...it.items, ...it.items].map((l, i) => <img key={i} src={l.src} alt={i < it.items.length ? l.alt : ''} aria-hidden={i >= it.items.length} loading="lazy" />)}
        </div>
      </div>
    );
    case 'cards':
      // Customer/partner boxes (logo + text) run as a slow belt instead of a grid.
      if (it.items.length >= 4 && it.items.every(c => /logo|240x100/.test(c.img?.src || ''))) return (
        <div className="belt">
          <div className="belt__track">
            {[...it.items, ...it.items].map((c, i) => (
              <article className="belt__card" key={i} aria-hidden={i >= it.items.length || undefined}>
                <div className="belt__logo"><img src={c.img.src} alt={c.title} loading="lazy" /></div>
                <h3>{c.title}</h3>
                {c.body[0] && <p>{c.body[0].text}</p>}
                {c.btns[0] && <a className="card__link" href={c.btns[0].href} tabIndex={i >= it.items.length ? -1 : undefined}>{c.btns[0].text}</a>}
              </article>
            ))}
          </div>
        </div>
      );
      return (
      <div className={`grid grid--cards stagger${it.items.length >= 3 ? ' bento' : ''}`}>
        {it.items.map((c, i) => (
          <SpotlightCard key={i} className="card" spotlightColor="#009acd">
            {c.img && <img className="card__img" src={c.img.src} alt={c.img.alt} loading="lazy" />}
            <h3>{c.title}</h3>
            {c.body.map((p, j) => <p key={j}>{p.text}</p>)}
            {c.btns.map((b, j) => <a key={j} className="card__link" href={b.href}>{b.text}</a>)}
          </SpotlightCard>
        ))}
      </div>
    );
  }
}

export default function Page({ page }) {
  if (PROSE.includes(page.route)) {
    return (
      <article className="section prose">
        <h1>{page.title}</h1>
        {page.blocks.map((b, i) => (b.t === 'li' ? <li key={i}>{b.text}</li> : b.t === 'img' ? null : (T => <T key={i}>{b.text}</T>)(b.t === 'h1' ? 'h2' : b.t)))}
      </article>
    );
  }
  // Topic pages already show the ContactBox – drop the crawled "Unser Experte …" lines, their portrait and stray headset photos.
  const dupContact = b => (b.t === 'img' && /2026-03-ansprechpartner|katarzyna-headset/.test(b.src)) || (b.t === 'p' && /^Unser Experte .{0,40}(freut sich|berät Sie)/.test(b.text));
  const structured = structure(page.route === '' ? homeBlocks(page.blocks) : page.route !== 'ueber-uns' ? page.blocks.filter(b => !dupContact(b)) : page.blocks);
  const hero = structured.hero;
  // Home: stats and the reference teaser are rendered by the dedicated home sections – drop the crawled duplicates.
  const sections = page.route === 'kontakt' ? [] : page.route !== '' ? structured.sections : structured.sections
    .filter(s => !/kunden vertrauen|^unsere leistungen$|sichern sie sich jetzt/i.test(s.heading || ''))
    .map(s => ({ ...s, items: s.items.filter(it => it.t !== 'stats') }))
    .filter(s => s.heading || s.items.length);
  const jump = sections.filter(s => s.heading).map((s, i) => ({ id: `s${sections.indexOf(s)}`, label: s.heading.length > 34 ? s.heading.slice(0, 32) + '…' : s.heading }));
  const wantsBooking = page.route === 'kontakt' || page.route === '';
  return (
    <>
      <Hero page={page} blocks={hero} />
      {page.route === '' && <><PartnerStrip /><TrustStats /><Needs /><Services /></>}
      {page.route && <OnThisPage sections={jump} />}
      {page.route && contactFor(page.route) && <section className="section section--tight"><ContactBox route={page.route} /></section>}
      {!page.blocks.length && (
        <section className="section">
          <p>Der Inhalt dieser Seite wird auf der aktuellen Website über ein externes Modul geladen.</p>
          <a className="btn btn--ghost" href={page.url} target="_blank" rel="noreferrer">Auf der aktuellen Website ansehen</a>
        </section>
      )}
      {sections.map((s, i) => {
        const hasImg = s.items.some(it => it.t === 'img');
        const story = page.route === '' && /Leidenschaft/.test(s.heading || '');
        return (
          <section key={i} id={`s${i}`} className={`section${hasImg ? ' section--media' : ''}${story ? ' section--story' : ''}${i % 2 ? ' section--alt' : ''}`}>
            <div className="section__head">
              {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
              {s.heading && (s.level === 'h2' ? <h2 className="reveal">{s.heading}</h2> : <h3 className="h2 reveal">{s.heading}</h3>)}
            </div>
            <div className="section__body">{s.items.map((it, j) => <Item key={j} it={it} />)}</div>
          </section>
        );
      })}
      {page.route === 'softwareloesungen' && <section className="section section--tight"><ProfileStudioCard /></section>}
      {page.route && <Related route={page.route} />}
      {page.route === '' && <><ToolTeasers /><CustomerBelt /><IntroSteps /><BlogTeasers /></>}
      {page.route === 'kontakt' && <><ContactForm /><IntroSteps steps={false} /><RegionMap /></>}
      {page.route.startsWith('blog/') && (
        <section className="section cta-check">
          <h2>Wie gut ist Ihr Unternehmen gegen dieses Risiko geschützt?</h2>
          <p>Finden Sie es in zwei Minuten heraus – oder lassen Sie es von uns prüfen.</p>
          <div className="btn-row"><a className="btn" href="/schnell-check">Schnell-Check starten</a><a className="btn btn--ghost" href="/termin">Cybersecurity-Check buchen</a></div>
        </section>
      )}
      {!wantsBooking && (
        <section className="section cta reveal">
          <AnimatedLogo mode="scrub" className="cta__mark" label="" />
          <h2>Lassen Sie uns über Ihr Projekt sprechen.</h2>
          <p>Kostenloses Erstgespräch – direkt online buchen.</p>
          <a className="btn" href="/termin">Termin vereinbaren</a>
        </section>
      )}
    </>
  );
}
