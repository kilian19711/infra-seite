import { useEffect, useState } from 'react';
import SplitText from '../components/SplitText';
import SpotlightCard from '../components/SpotlightCard';
import HubSpotMeeting from '../components/HubSpotMeeting';
import RegionMap from '../components/RegionMap';
import Scene3D from '../components/Scene3D';
import { Breadcrumbs } from '../components/Wayfinding';
import { byRoute, team, PHONE, PHONE_HREF } from '../data/site';

const page = byRoute['ueber-uns'];
const text = start => page.blocks.find(b => b.t === 'p' && b.text.startsWith(start))?.text;
const quotes = page.blocks.filter(b => b.t === 'p' && b.text.startsWith('„')).map(b => b.text);
const milestoneText = page.blocks.filter(b => b.t === 'li').map(b => b.text);
const years = ['2010', '2015', '2019', '2022', 'Heute'];

const stats = [
  { value: 16, label: 'Jahre IT-Erfahrung' },
  { value: 100, suffix: '+', label: 'zufriedene Kunden' },
  { value: 19, label: 'IT-Expertinnen und -Experten' },
  { value: 18, label: 'Tage im Schnitt bis zum cybersicheren Betrieb' },
];

const references = [
  ['/img/2026-03-zagro-240x100-1.jpg', 'ZAGRO Bahn- und Baumaschinen GmbH', 'Transparente Endpoint-Verwaltung mit der baramundi Management Suite', 'referenz/referenzkunde-zagro-bahn-und-baumaschinen-gmbh'],
  ['/img/2026-03-gemeinde-sulzbach-240x100-1.jpg', 'Gemeinde Sulzbach an der Murr', 'Digitale Kommunikation mit der Swyx IP-Telefonanlage', 'referenz/referenzkunde-gemeinde-sulzbach-an-der-murr'],
  ['/img/2026-04-dickow-pumpen.jpg', 'DICKOW PUMPEN GmbH & Co. KG', 'Neue Serverlandschaft mit Cybersecurity von Sophos', 'referenz/referenzbericht-dickow-pumpen-gmbh-co-kg'],
];

export default function About() {
  const [quote, setQuote] = useState(0);
  useEffect(() => {
    if (quotes.length < 2) return;
    const id = setInterval(() => setQuote(q => (q + 1) % quotes.length), 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <section className="page-hero">
        <Scene3D variant="globe" />
        <div className="hud" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="page-hero__text">
          <Breadcrumbs route="ueber-uns" title="Über uns" />
          <p className="eyebrow">Über uns · IT-Systemhaus in der Region Stuttgart</p>
          <SplitText tag="h1" text="Wir machen Ihre IT fit für eine sichere und erfolgreiche Zukunft." className="page-hero__title" splitType="words" delay={50} textAlign="left" threshold={0} rootMargin="0px" />
          <p className="page-hero__lead">{text('Unsere Mission')}</p>
          <div className="page-hero__cta">
            <a href="/termin" className="btn">Beratungstermin vereinbaren</a>
            <a href={PHONE_HREF} className="btn btn--ghost">{PHONE}</a>
          </div>
        </div>
        <figure className="page-hero__img"><img src="/img/2025-05-mitarbeiter-l-mobile.jpg" alt="Das Team von L-mobile infrastructure" /></figure>
        <div className="scroll-hint" aria-hidden="true">Scroll</div>
      </section>

      <section className="stats stagger" aria-label="Zahlen">
        {stats.map(s => (
          <div className="stat" key={s.label}>
            <strong data-count={s.value} data-suffix={s.suffix || ''}>{s.value}{s.suffix}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      <section className="section section--media">
        <div className="section__head">
          <p className="eyebrow reveal">Regional, persönlich, kompetent</p>
          <h2 className="reveal">IT-Experten mit Leidenschaft – seit 16 Jahren.</h2>
        </div>
        <div className="section__body">
          <p className="reveal prose-p">{text('Als regionales IT-Systemhaus')}</p>
          <figure className="figure img-reveal parallax"><img src="/img/2026-03-infra-team-am-schreibtisch.jpg" alt="IT-Experten von L-mobile infrastructure am Schreibtisch" loading="lazy" /></figure>
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <p className="eyebrow reveal">Unsere Geschichte</p>
          <h2 className="reveal">Der Weg zu Ihrem IT-Systemhaus in der Region.</h2>
        </div>
        <div className="section__body">
          <p className="reveal prose-p">{text('Auch wir haben einmal klein angefangen')}</p>
          <ol className="timeline">
            <span className="timeline__line" aria-hidden="true"><span className="timeline__progress" /></span>
            {milestoneText.map((t, i) => (
              <li className="timeline__item reveal" key={i}>
                <span className="timeline__year">{years[i]}</span>
                <p>{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <p className="eyebrow reveal">Die Menschen hinter den Kulissen</p>
          <h2 className="reveal">Ihre Ansprechpartner für das nächste IT-Projekt.</h2>
        </div>
        <div className="grid grid--cards stagger">
          {team.map(p => (
            <article className="person" key={p.name}>
              <div className="person__photo"><img src={p.img} alt={`${p.name}, ${p.role}`} loading="lazy" /></div>
              <h3>{p.name}</h3>
              <p className="person__role">{p.role}</p>
              <p>{p.text}</p>
              <a href="/termin" data-person={p.name} className="card__link">Termin mit {p.name.split(' ')[0]}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--alt">
        <div className="section__head">
          <p className="eyebrow reveal">Referenzen</p>
          <h2 className="reveal">Über 100 Kunden vertrauen auf uns.</h2>
        </div>
        <div className="grid grid--cards stagger">
          {references.map(([logo, client, project, route]) => (
            <SpotlightCard key={client} className="card card--link" spotlightColor="#009acd">
              <a href={`/${route}`}>
                <img className="card__img card__img--logo" src={logo} alt={client} loading="lazy" />
                <h3>{project}</h3>
                <p>{client}</p>
                <span className="card__link">Case Study entdecken</span>
              </a>
            </SpotlightCard>
          ))}
        </div>
        {quotes.length > 0 && (
          <figure className="testimonial reveal" aria-live="polite">
            <blockquote key={quote}>{quotes[quote]}</blockquote>
            <div className="testimonial__dots">
              {quotes.map((q, i) => (
                <button key={i} aria-label={`Kundenstimme ${i + 1}`} aria-pressed={i === quote} onClick={() => setQuote(i)} />
              ))}
            </div>
          </figure>
        )}
      </section>

      <RegionMap />
      <HubSpotMeeting />
    </>
  );
}
