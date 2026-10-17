import { byRoute, pages, team, meetingHref, DIRECT } from '../data/site';
import { news, fmtDate } from '../data/news';
import HubSpotMeeting from '../components/HubSpotMeeting';

/* Idee 3: partner logos right after the hero. ponytail: only show with current partner status + vendor guidelines. */
// Each logo links to our own service page for that vendor (keeps visitors on the site).
const PARTNERS = [
  ['Sophos', '2025-05-SOPHOS_logo.png', 'it-sicherheit'],
  ['Microsoft', '2025-06-microsoft-logo.jpg', 'softwareloesungen/microsoft-365-azure'],
  ['baramundi', '2025-05-baramundi-logo.jpg', 'softwareloesungen/desktop-management-software'],
  ['ELO', '2025-05-elo-ecm-suite.jpg', 'softwareloesungen/dokumenten-management-systeme'],
  ['Enreach / Swyx', '2025-05-enreach-logo.jpg', 'it-infrastruktur/voip-telefonie'],
  ['Veeam', '2025-05-veeam_logo.png', 'it-infrastruktur/serverloesungen'],
  ['VMware', '2025-05-vmware_logo.png', 'it-infrastruktur/serverloesungen'],
  ['Dell', '2025-06-dell-logo.jpg', 'it-infrastruktur/serverloesungen'],
  ['TERRA', '2025-06-terra-logo.jpg', 'it-infrastruktur/serverloesungen'],
];

export function PartnerStrip() {
  return (
    <section className="partners" aria-label="Unsere Technologiepartner">
      <div className="partners__track">
        {[...PARTNERS, ...PARTNERS].map(([name, img, route], i) => {
          const dup = i >= PARTNERS.length;
          return (
            <a className="partners__logo" key={i} href={`/${route}`} title={name}
              aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined}>
              <img src={`/img/${img}`} alt={dup ? '' : `${name} – zur Leistung`} loading="lazy" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* Idee 5: trust counters (count up once, final value without motion). */
const KPI_ICONS = {
  years: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.8.8 3 2.7 3 5.6" /></>,
  shield: <><path d="M12 2.8 4.5 5.6v5.6c0 4.8 3.2 8.6 7.5 10 4.3-1.4 7.5-5.2 7.5-10V5.6z" /><path d="m8.8 12.2 2.3 2.3 4.3-4.6" /></>,
  region: <><path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z" /><circle cx="12" cy="9.5" r="2.6" /></>,
};

export function TrustStats() {
  const stats = [
    [16, '', 'Jahre Erfahrung', 'in IT-Projekten', 'years'],
    [100, '+', 'zufriedene Kunden', 'seit Beginn', 'customers'],
    [18, '', 'Tage', 'bis zum cybersicheren Betrieb', 'shield'],
    [1, '', 'Region', 'das Ländle', 'region'],
  ];
  return (
    <section className="kpis stagger" aria-label="Zahlen">
      {stats.map(([n, suf, label, sub, icon]) => (
        <div className="kpi" key={label}>
          <span className="kpi__icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{KPI_ICONS[icon]}</svg></span>
          <strong data-count={n} data-suffix={suf}>{n}{suf}</strong>
          <span className="kpi__label">{label}</span>
          <span className="kpi__sub">{sub}</span>
        </div>
      ))}
    </section>
  );
}

/* Idee 4: customer logos as a belt, plus reviews. ponytail: publish only with written customer approval. */
const CUSTOMERS = [
  ['ZAGRO Bahn- und Baumaschinen GmbH', '2026-03-zagro-240x100-1.jpg', 'referenz/referenzkunde-zagro-bahn-und-baumaschinen-gmbh'],
  ['Gemeinde Sulzbach an der Murr', '2026-03-gemeinde-sulzbach-240x100-1.jpg', 'referenz/referenzkunde-gemeinde-sulzbach-an-der-murr'],
  ['DICKOW PUMPEN GmbH & Co. KG', '2026-04-dickow-pumpen.jpg', 'referenz/referenzbericht-dickow-pumpen-gmbh-co-kg'],
  ['KLAFS GmbH & Co. KG', '2026-03-klafs-240x100-1.jpg', 'referenz/referenzkunde-klafs-gmbh-co-kg'],
  ['L-mobile solutions', '2026-07-lmobile-240x100-1.jpg', 'referenz/referenzkunde-l-mobile-solutions'],
];
// Real testimonials from the previous website (pages.json), with person + company as published there.
// Text is looked up by its opening words so the longest published version is used.
const allQuotes = [...new Set(pages.flatMap(p => p.blocks.filter(b => b.t === 'p' && b.text.startsWith('„')).map(b => b.text)))];
const quote = start => {
  const hits = allQuotes.filter(q => q.includes(start)).sort((a, b) => b.length - a.length);
  return hits[0] ? hits[0].replace(/^„|“$/g, '').replace(/\s+([.,!?])/g, '$1').trim() : null;
};
const TESTIMONIALS = [
  { start: 'geteiltes WLAN', name: 'Markus Dinzl', role: 'Junior Chef', company: 'DINZL Ordnungstechnik GmbH' },
  { start: 'nicht nur Experte in Sachen Server', name: 'Reinhard Schossig', role: 'IT- und Organisationsleiter', company: 'DICKOW PUMPEN GmbH & Co. KG' },
  { start: 'Wir hatte bereits Kontakt', name: 'Chris König', role: 'IT-Abteilungsleiter', company: 'ZAGRO Bahn- und Baumaschinen GmbH' },
  { start: 'Wichtigkeit einer tauglichen', name: 'Lars Piechot & Maurice Link', role: 'Geschäftsführer & EDV-Mitarbeiter', company: 'AWO Schwäbisch Hall' },
  // ponytail: old site names this person both "Sascha Reber" and "Sascha Gommel" – confirm before go-live.
  { start: 'überzeugt mit ihren fachlichen', name: 'Sascha Reber', role: 'Stellvertretender Kämmerer', company: 'Gemeinde Sulzbach an der Murr' },
  { start: 'umfassendes Dienstleistungsangebot', name: 'Enrico Held', role: 'Projektleiter', company: 'Martin Logistik GmbH' },
  { start: 'überzeugte von Anfang bis Ende', name: 'Andreas Gugler', role: 'Technischer Sachbearbeiter', company: 'KLAFS GmbH & Co. KG' },
].map(t => ({ ...t, text: quote(t.start) })).filter(t => t.text);
console.assert(TESTIMONIALS.length >= 6, 'testimonials found in pages.json');

const Stars = ({ n }) => (
  <span className="stars" role="img" aria-label={`${n} von 5 Sternen`}>
    {[1, 2, 3, 4, 5].map(i => (
      <svg key={i} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className={i <= Math.round(n) ? 'on' : ''}>
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
      </svg>
    ))}
  </span>
);

/*
 * One-time snapshot of the Google Business Profile (copied by hand, no API, not updated automatically).
 * Fill rating/total and add reviews as { rating, text, author, relative } – they appear with stars + Google logo,
 * mixed with our own testimonials. Keep author names exactly as shown on Google.
 */
const GOOGLE_SNAPSHOT = {
  rating: 5.0, // Stand 15.10.2026 laut Google-Profil
  total: 6,
  maps_url: 'https://www.google.com/maps/place/L-mobile+infrastructure+IT-Systemhaus/@49.0018467,9.4892787,17z/data=!4m8!3m7!1s0x47984b0899ab8c4d:0x5d389ff5c8873721!8m2!3d49.0018432!4d9.4918536!9m1!1b1',
  reviews: [
    // { rating: 5, author: 'Name wie bei Google', relative: 'vor 3 Monaten', text: '…' },
  ],
};
const useGoogleReviews = () => (GOOGLE_SNAPSHOT.reviews.length && GOOGLE_SNAPSHOT.rating ? GOOGLE_SNAPSHOT : null);

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

export function CustomerBelt() {
  const google = useGoogleReviews();
  const g = google ? google.reviews.map(v => ({ ...v, google: true })) : [];
  // Interleave Google reviews and own testimonials so both kinds are spread over the belt.
  const items = [];
  for (let i = 0; i < Math.max(g.length, TESTIMONIALS.length); i++) {
    if (g[i]) items.push(g[i]);
    if (TESTIMONIALS[i]) items.push(TESTIMONIALS[i]);
  }
  return (
    <section className="section section--alt reviews-section" aria-labelledby="customers-h">
      <div className="reviews-head">
        <div className="section__head">
          <p className="eyebrow">Kundenstimmen</p>
          <h2 id="customers-h">Über 100 Kunden vertrauen auf uns.</h2>
        </div>
        {/* Google box: overall stars from the Google profile; click opens all reviews on Google Maps */}
        <a className="reviews-score" href={GOOGLE_SNAPSHOT.maps_url} target="_blank" rel="noopener noreferrer"
          aria-label="Alle Rezensionen auf Google Maps ansehen">
          <GoogleMark />
          {GOOGLE_SNAPSHOT.rating ? (
            <>
              <strong>{GOOGLE_SNAPSHOT.rating.toFixed(1).replace('.', ',')}</strong>
              <div><Stars n={GOOGLE_SNAPSHOT.rating} /><span>{GOOGLE_SNAPSHOT.total} Google-Rezensionen ansehen</span></div>
            </>
          ) : (
            <div><b>Google-Rezensionen</b><span>Alle Bewertungen ansehen</span></div>
          )}
        </a>
      </div>

      <div className="reviews-belt">
        <div className="reviews-belt__track">
          {[...items, ...items].map((r, i) => {
            const dup = i >= items.length;
            const who = r.google ? r.author : r.name;
            return (
              <figure className="rv" key={i} aria-hidden={dup || undefined}>
                <div className="rv__top">
                  {r.google ? <Stars n={r.rating} /> : <span className="rv__quote" aria-hidden="true">“</span>}
                  {r.google && <span className="rv__source" title="Bewertung auf Google"><GoogleMark /></span>}
                </div>
                <blockquote>{r.text}</blockquote>
                <figcaption>
                  <span className="rv__avatar" aria-hidden="true">{who[0]}</span>
                  <span>
                    <strong>{who}</strong>
                    <small>{r.google ? `${r.relative} · Google` : `${r.role} · ${r.company}`}</small>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      <div className="reviews-logos" aria-label="Auswahl unserer Kunden">
        {CUSTOMERS.map(([name, img, r]) => (
          <a key={r} href={`/${r}`} title={`Referenz: ${name}`}><img src={`/img/${img}`} alt={name} loading="lazy" /></a>
        ))}
      </div>
      <a className="card__link" href="/referenzen">Alle Referenzen ansehen</a>
    </section>
  );
}

/* Idee 7: booking via HubSpot (consent-gated). */
export const MeetingBooking = HubSpotMeeting;

/* Idee 6: short introduction in steps → contact persons → booking. */
const STEPS = [
  ['Kennenlernen', 'Ein kurzes Gespräch per Telefon oder Teams: Wo steht Ihre IT, wo drückt der Schuh?'],
  ['Analyse', 'Wir prüfen Ihre Umgebung – bei IT-Sicherheit mit unserer OZELOT-Methode in sechs Kernbereichen.'],
  ['Umsetzung', 'Eigenes Installationsteam inklusive Elektriker. Im Schnitt in 18 Tagen cybersicher.'],
  ['Betreuung', 'Ein persönlicher Ansprechpartner – auch nach dem Go-live, mit modernem Ticketsystem.'],
];

export function IntroSteps({ steps = true }) {
  return (
    <>
      {steps && <section className="section" aria-labelledby="steps-h">
        <div className="section__head">
          <p className="eyebrow">So arbeiten wir</p>
          <h2 id="steps-h">Vom ersten Gespräch zur sicheren IT.</h2>
        </div>
        <ol className="steps stagger">
          {STEPS.map(([title, text]) => <li key={title}><strong>{title}</strong><p>{text}</p></li>)}
        </ol>
      </section>}
      <section className="section section--alt" aria-labelledby="team-h">
        <div className="section__head">
          <p className="eyebrow">Ihre Ansprechpartner</p>
          <h2 id="team-h">Menschen, die Ihre IT kennen.</h2>
        </div>
        <div className="grid grid--cards stagger">
          {team.map(p => (
            <article className="person" key={p.name}>
              <div className="person__photo"><img src={p.img} alt={`${p.name}, ${p.role}`} loading="lazy" /></div>
              <h3>{p.name}</h3>
              <p className="person__role">{p.role}</p>
              <p>{p.text}</p>
              {DIRECT[p.name]?.meeting && <a href={meetingHref(p.name)} data-person={p.name} className="card__link">Termin mit {p.name.split(' ')[0]}</a>}
            </article>
          ))}
        </div>
      </section>
      <MeetingBooking />
    </>
  );
}

/* Ideen 8, 9, 12: entry points to the interactive tools. */
export function ToolTeasers() {
  const tools = [
    ['Schnell-Check', 'Wie sicher ist Ihr Unternehmen? Sechs Fragen, Ampel-Ergebnis, konkrete Empfehlung.', 'schnell-check', 'Check starten'],
    ['Ausfallkosten-Rechner', 'Was kostet ein Tag IT-Stillstand? In 30 Sekunden ausgerechnet.', 'ausfallkosten', 'Jetzt berechnen'],
    ['Phishing-Training', 'Erkennen Sie den Betrug? Sechs simulierte Nachrichten mit Auflösung.', 'phishing-training', 'Training starten'],
  ];
  return (
    <section className="section" aria-labelledby="tools-h">
      <div className="section__head">
        <p className="eyebrow">Selbst ausprobieren</p>
        <h2 id="tools-h">Ihre IT-Sicherheit in wenigen Minuten einschätzen.</h2>
      </div>
      <div className="grid grid--cards stagger">
        {tools.map(([title, text, r, cta]) => (
          <a key={r} className="tool-card" href={`/${r}`}>
            <h3>{title}</h3><p>{text}</p><span className="card__link">{cta}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/* Idee 11: latest blog posts – each post ends with the Cybersecurity-Check CTA (Page.jsx). */
export function BlogTeasers() {
  // Newest news commentary first, then the older blog articles.
  const posts = [
    ...news.map(n => ({ route: `aktuelles/${n.slug}`, title: n.title, date: n.date, blocks: [] })),
    ...pages.filter(p => p.route.startsWith('blog/')),
  ].slice(0, 3);
  return (
    <section className="section" aria-labelledby="blog-h">
      <div className="section__head">
        <p className="eyebrow">IT-Insights</p>
        <h2 id="blog-h">Aktuelle IT-Themen – und was wir dazu sagen.</h2>
      </div>
      <div className="grid grid--cards stagger">
        {posts.map(p => {
          const img = p.blocks.find(b => b.t === 'img');
          return (
            <a key={p.route} className="tool-card tool-card--post" href={`/${p.route}`}>
              {img && <img src={img.src} alt="" loading="lazy" />}
              {p.date && <time className="news__date" dateTime={p.date}>{fmtDate(p.date)}</time>}
              <h3>{p.title}</h3>
              <span className="card__link">Beitrag lesen</span>
            </a>
          );
        })}
      </div>
      <a className="card__link" href="/aktuelles">Alle aktuellen Beiträge</a>
    </section>
  );
}
