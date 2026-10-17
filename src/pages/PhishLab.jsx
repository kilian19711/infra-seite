import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Wayfinding';
import Scene3D from '../components/Scene3D';

/*
 * Idee 12: Phishing-Training. The player is always "Max Mustermann". Each round picks a random (fictitious) company
 * context so all domains change, and 8 of 14 scenario templates. Phishing uses typical look-alike domains of the
 * known senders, so the profile card is enough to judge every message. All companies/domains are invented –
 * except L-mobile infrastructure as the IT provider. No data is collected.
 */

const CONTEXTS = [
  { company: 'Musterbau GmbH', domain: 'musterbau.de', boss: 'Erika Muster', bank: 'Kreisbank Musterstadt', bankDomain: 'kreisbank-musterstadt.de', bankShort: 'KreisBank',
    supplier: 'Huber Befestigungstechnik', supplierDomain: 'huber-befestigung.de', parcel: 'PaketBlitz', parcelDomain: 'paketblitz.de', cloud: 'CloudOffice', cloudDomain: 'cloudoffice.de' },
  { company: 'Mustermann Logistik GmbH', domain: 'mustermann-logistik.de', boss: 'Petra Beispiel', bank: 'Volksbank Beispieltal', bankDomain: 'vb-beispieltal.de', bankShort: 'VB Beispieltal',
    supplier: 'Reifen Krause KG', supplierDomain: 'reifen-krause.de', parcel: 'SchnellPost', parcelDomain: 'schnellpost.de', cloud: 'TeamDrive Pro', cloudDomain: 'teamdrive-pro.de' },
  { company: 'Beispiel Holzbau AG', domain: 'beispiel-holzbau.de', boss: 'Thomas Vorbild', bank: 'Sparkasse Musterland', bankDomain: 'sparkasse-musterland.de', bankShort: 'Spk Musterland',
    supplier: 'Holzhandel Lindner', supplierDomain: 'holz-lindner.de', parcel: 'Paketdienst Flink', parcelDomain: 'flink-paket.de', cloud: 'Workspace One', cloudDomain: 'workspace-one.de' },
];
const IT = { name: 'L-mobile infrastructure', domain: 'infrastructure-systemhaus.de' };

// Look-alike helpers: the typical tricks attackers use on a known domain.
const base = d => d.replace(/\.de$/, '');
const fake = {
  rn: d => d.replace('m', 'rn'),            // m → rn
  tld: d => `${base(d)}.com`,               // other top-level domain
  hyphen: (d, w) => `${base(d)}-${w}.com`,  // extra word
  zero: d => d.replace('o', '0'),           // o → 0
};
console.assert(fake.rn('musterbau.de') === 'rnusterbau.de' && fake.tld('musterbau.de') === 'musterbau.com', 'look-alike domains');

const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }); };

// Each template builds a message from the round's context c. why = what gives it away (or why it is fine).
const TEMPLATES = [
  c => ({ kind: 'mail', phish: true, fromName: c.boss, from: `${c.boss.toLowerCase().replace(' ', '.')}@${fake.rn(c.domain)}`, subject: 'Dringend – bitte heute noch erledigen',
    body: [`Hallo Max,`, `ich bin gerade in einem Termin und nicht erreichbar. Bitte überweise heute noch 18.450 € an unseren neuen Geschäftspartner. Die Kontodaten schicke ich dir gleich. Bitte vertraulich behandeln.`, `Gruß ${c.boss.split(' ')[0]}`],
    why: [`Absender-Domain ${fake.rn(c.domain)} statt ${c.domain} – „rn“ sieht aus wie „m“`, 'Zeitdruck und Geheimhaltung', 'Überweisungen nie ohne Rückruf auf bekannter Nummer'] }),
  c => ({ kind: 'mail', phish: false, fromName: c.boss, from: `${c.boss.toLowerCase().replace(' ', '.')}@${c.domain}`, subject: 'Teammeeting verschoben',
    body: ['Hallo zusammen,', 'das Teammeeting verschiebt sich auf Donnerstag, 10 Uhr, gleicher Raum. Bitte bringt eure Quartalszahlen mit.', `Danke, ${c.boss.split(' ')[0]}`],
    why: [`Domain ${c.domain} ist eure eigene`, 'Kein Link, kein Anhang, keine Datenabfrage', 'Inhalt passt zum normalen Arbeitsalltag'] }),
  c => ({ kind: 'mail', phish: true, fromName: `${c.bank} Sicherheit`, from: `service@${fake.hyphen(c.bankDomain, 'sicherheit')}`, subject: 'Ihr Konto wurde vorübergehend eingeschränkt',
    body: ['Sehr geehrter Kunde,', 'aufgrund ungewöhnlicher Aktivitäten wurde Ihr Online-Banking eingeschränkt. Bestätigen Sie innerhalb von 24 Stunden Ihre Identität, um eine Sperrung zu vermeiden.'],
    link: { text: 'Jetzt Identität bestätigen', url: `https://${base(c.bankDomain)}-login.info/verify` },
    why: [`Absender ${fake.hyphen(c.bankDomain, 'sicherheit')} statt ${c.bankDomain}`, `Linkziel ${base(c.bankDomain)}-login.info gehört nicht zur Bank`, 'Unpersönliche Anrede und 24-Stunden-Druck'] }),
  c => ({ kind: 'mail', phish: false, fromName: c.bank, from: `noreply@${c.bankDomain}`, subject: 'Neuer Kontoauszug verfügbar',
    body: ['Guten Tag Herr Mustermann,', 'für Ihr Geschäftskonto steht ein neuer Kontoauszug bereit. Sie finden ihn wie gewohnt in Ihrem Online-Banking – rufen Sie es bitte direkt über unsere Website oder App auf.'],
    why: [`Domain ${c.bankDomain} passt zur Hausbank`, 'Persönliche Anrede', 'Kein Link – Sie sollen das Banking selbst aufrufen'] }),
  c => ({ kind: 'mail', phish: true, fromName: `${c.supplier} Buchhaltung`, from: `buchhaltung@${fake.tld(c.supplierDomain)}`, subject: 'Wichtig: Neue Bankverbindung ab sofort',
    body: ['Sehr geehrte Damen und Herren,', 'wegen eines Bankwechsels bitten wir Sie, offene Rechnungen ab sofort nur noch auf unser neues Konto zu überweisen. Die neue IBAN finden Sie im Anhang.'],
    attachment: 'Neue_Bankverbindung.pdf.exe',
    why: [`Domain ${fake.tld(c.supplierDomain)} statt ${c.supplierDomain}`, 'Geänderte Bankdaten per E-Mail – klassischer Rechnungsbetrug', 'Anhang endet auf .exe – das ist ein Programm, kein PDF'] }),
  c => ({ kind: 'mail', phish: false, fromName: c.supplier, from: `rechnung@${c.supplierDomain}`, subject: 'Rechnung 2026-1043 zu Ihrer Bestellung',
    body: ['Guten Tag Herr Mustermann,', 'anbei erhalten Sie die Rechnung zu Ihrer Bestellung vom letzten Dienstag. Zahlbar wie gewohnt innerhalb von 14 Tagen auf die bekannte Bankverbindung.'],
    attachment: 'Rechnung_2026-1043.pdf',
    why: [`Domain ${c.supplierDomain} ist der bekannte Lieferant`, 'Bezug auf eine echte Bestellung', 'Normales PDF, keine geänderten Bankdaten'] }),
  c => ({ kind: 'sms', phish: true, fromName: '+49 1577 0000 312', subject: '',
    body: [`${c.parcel}: Ihr Paket konnte nicht zugestellt werden. Bitte Zustellgebühr von 1,99 € begleichen:`],
    link: { text: `${base(c.parcelDomain)}-zustellung.info/z`, url: `https://${base(c.parcelDomain)}-zustellung.info/z` },
    why: ['Unbekannte Handynummer statt Absendername', `Link nicht auf ${c.parcelDomain}`, 'Kleine Gebühr soll an Kartendaten kommen'] }),
  c => ({ kind: 'sms', phish: false, fromName: c.bankShort, subject: '',
    body: ['Ihr Freigabe-Code für die Überweisung lautet 482913. Geben Sie diesen Code niemals weiter – auch nicht an Mitarbeitende der Bank.'],
    why: ['Absendername der Hausbank', 'Kein Link', 'Code passt zu einer Überweisung, die Sie selbst gestartet haben'] }),
  () => ({ kind: 'chat', phish: true, fromName: 'IT Support Helpdesk', external: true, subject: '',
    body: ['Hallo Max, wir führen gerade ein Sicherheitsupdate für dein Konto durch.', 'Damit nichts verloren geht, schick mir bitte kurz dein aktuelles Passwort, dann ist es in 2 Minuten erledigt.'],
    why: ['Als „Extern“ markiert – nicht aus eurer Firma', 'Echter IT-Support fragt nie nach Passwörtern', 'Zeitdruck („in 2 Minuten“)'] }),
  c => ({ kind: 'chat', phish: false, fromName: 'Lisa Kollegin', external: false, subject: '',
    body: ['Hi Max, gehst du nachher mit in die Kantine?', 'Und denk an die Unterlagen für das Meeting am Donnerstag.'],
    why: [`Interner Kontakt von ${c.company}`, 'Keine Links, keine Daten', 'Alltägliche Nachricht'] }),
  () => ({ kind: 'mail', phish: false, fromName: IT.name, from: `support@${IT.domain}`, subject: 'Geplante Wartung am Samstag',
    body: ['Hallo Herr Mustermann,', 'am Samstag zwischen 8 und 12 Uhr führen wir Wartungsarbeiten an Ihrer Serverumgebung durch. Es ist nichts zu tun. Bei Fragen erreichen Sie uns über das Ticketsystem.'],
    link: { text: 'Zum Ticketsystem', url: `https://${IT.domain}/service` },
    why: [`Domain ${IT.domain} ist euer IT-Dienstleister`, `Link führt auf ${IT.domain}`, 'Reine Information, keine Datenabfrage'] }),
  () => ({ kind: 'mail', phish: true, fromName: `${IT.name} Support`, from: `support@infrastructure-systemhaus.support`, subject: 'Ihr Passwort läuft heute ab',
    body: ['Sehr geehrter Nutzer,', 'Ihr Passwort läuft heute um 17:00 Uhr ab. Behalten Sie Ihr aktuelles Passwort, indem Sie es über den folgenden Link bestätigen.'],
    link: { text: 'Aktuelles Passwort behalten', url: 'https://infrastructure-systemhaus.support/keep-password' },
    why: [`Domain endet auf .support statt ${IT.domain}`, '„Passwort bestätigen“ – seriöse Anbieter fragen das nie per Link ab', 'Unpersönliche Anrede und Frist'] }),
  c => ({ kind: 'mail', phish: true, fromName: c.cloud, from: `noreply@${fake.zero(c.cloudDomain)}`, subject: `${c.boss} hat ein Dokument mit Ihnen geteilt`,
    body: [`${c.boss} hat „Gehaltsanpassung_2027.xlsx“ mit Ihnen geteilt.`, 'Melden Sie sich an, um das Dokument zu öffnen.'],
    link: { text: 'Dokument öffnen', url: `https://${fake.zero(c.cloudDomain)}/login` },
    why: [`Domain ${fake.zero(c.cloudDomain)} – eine Null statt „o“ (richtig: ${c.cloudDomain})`, 'Neugier-Köder „Gehaltsanpassung“', 'Anmeldeseite auf fremder Domain stiehlt Zugangsdaten'] }),
  c => ({ kind: 'mail', phish: true, fromName: 'Personalabteilung', from: `personal@${base(c.domain)}.co`, subject: 'Ihre Gehaltsabrechnung Oktober',
    body: ['Hallo Max,', 'anbei deine Gehaltsabrechnung. Das Archiv ist aus Datenschutzgründen gepackt – einfach entpacken und die Datei öffnen.'],
    attachment: 'Abrechnung_Oktober.zip',
    why: [`Domain ${base(c.domain)}.co statt ${c.domain}`, 'ZIP-Anhang mit Aufforderung zum Öffnen – typisch für Schadsoftware', 'Abrechnungen kommen meist über ein Portal, nicht als ZIP'] }),
];
const ROUND = 8;

function newRound() {
  const ctx = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];
  // Shuffle, then make sure a round has at least 3 legit and 3 phishing messages.
  for (;;) {
    const pick = [...TEMPLATES].sort(() => Math.random() - 0.5).slice(0, ROUND).map((t, i) => ({ id: i, date: day(Math.floor(Math.random() * 3)), ...t(ctx) }));
    const phish = pick.filter(m => m.phish).length;
    if (phish >= 3 && ROUND - phish >= 3) return { ctx, msgs: pick };
  }
}

/* ---------- realistic message views (mail client / chat app / phone) – generic look, no vendor branding ---------- */
// Each view plays a short "arrival" animation and calls onReady() once the message is fully shown.
function useArrival(onReady, ms) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = reduce ? [] : [setTimeout(() => setStep(1), ms[0]), setTimeout(() => setStep(2), ms[1])];
    if (reduce) setStep(2);
    const done = setTimeout(onReady, reduce ? 0 : ms[1] + 200);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return step;
}

const OLD_MAILS = c => [
  { from: c.boss, subject: 'Re: Urlaubsplanung Q4', preview: 'Passt für mich, bitte trag es im Kalender ein.', time: 'Gestern' },
  { from: 'Newsletter Fachverband', subject: 'Veranstaltungen im November', preview: 'Unsere Themen in diesem Monat …', time: 'Mo.' },
  { from: c.supplier, subject: 'Lieferavis KW 42', preview: 'Ihre Bestellung wurde versendet.', time: 'Fr.' },
];

function MailView({ m, ctx, onLink, onReady }) {
  const step = useArrival(onReady, [500, 1300]); // 0: list only · 1: new mail + toast · 2: opened
  const [hover, setHover] = useState(null);
  return (
    <div className="ol">
      <div className="ol__top"><span className="ol__app">Postfach</span><span className="ol__search">Suchen</span><span className="ol__me">MM</span></div>
      <div className="ol__body">
        <nav className="ol__folders" aria-hidden="true">
          <b>max.mustermann@{ctx.domain}</b>
          <span className="is-active">Posteingang <em>{step >= 1 ? 1 : 0}</em></span><span>Entwürfe</span><span>Gesendete Elemente</span><span>Junk-E-Mail</span><span>Archiv</span>
        </nav>
        <div className="ol__list" aria-hidden="true">
          <div className="ol__list-head">Fokussiert <span>Sonstige</span></div>
          {step >= 1 && (
            <div className={`ol__item ol__item--new${step === 2 ? ' is-selected' : ''}`}>
              <strong>{m.fromName}</strong><span className="ol__time">Jetzt</span>
              <span className="ol__subj">{m.subject}</span><span className="ol__prev">{m.body[0]}</span>
            </div>
          )}
          {OLD_MAILS(ctx).map(o => (
            <div key={o.subject} className="ol__item"><strong>{o.from}</strong><span className="ol__time">{o.time}</span><span className="ol__subj">{o.subject}</span><span className="ol__prev">{o.preview}</span></div>
          ))}
        </div>
        <div className="ol__read">
          {step < 2 ? <div className="ol__empty">Wählen Sie ein Element zum Lesen aus.</div> : (
            <div className="ol__msg">
              <div className="ol__tools" aria-hidden="true"><span>Antworten</span><span>Allen antworten</span><span>Weiterleiten</span><span>Löschen</span></div>
              <h3>{m.subject}</h3>
              <div className="ol__from">
                <div className="pm-avatar">{m.fromName[0]}</div>
                <div><strong>{m.fromName}</strong> <span className="pm-addr">&lt;{m.from}&gt;</span><div className="pm-meta">An: Max Mustermann · {m.date}</div></div>
              </div>
              {m.attachment && <button type="button" className="ol__attach" onClick={onLink}><span className="pm-attach__label">Anhang</span>{m.attachment}</button>}
              <div className="ol__text">
                {m.body.map((p, i) => <p key={i}>{p}</p>)}
                {m.link && (
                  <button type="button" className="pm-link" onMouseEnter={() => setHover(m.link.url)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(m.link.url)} onBlur={() => setHover(null)} onClick={onLink}>{m.link.text}</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={`pm-status${hover ? ' is-on' : ''}`}>{hover ? hover : 'Tipp: Mit der Maus über Links fahren – hier unten erscheint das echte Ziel.'}</div>
      {step === 1 && (
        <div className="ol__toast" role="status"><b>{m.fromName}</b><span>{m.subject}</span></div>
      )}
    </div>
  );
}

function SmsView({ m, onLink, onReady }) {
  const step = useArrival(onReady, [400, 1600]); // 0: lock screen · 1: notification · 2: conversation
  const name = m.fromName[0] === '+' ? m.fromName : m.fromName;
  return (
    <div className="pm-phone">
      <div className="pm-phone__notch" />
      {step < 2 ? (
        <div className="pm-lock">
          <div className="pm-lock__time">{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="pm-lock__date">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          {step === 1 && <div className="pm-notif"><b>Nachrichten · jetzt</b><strong>{name}</strong><span>{m.body[0].slice(0, 70)}…</span></div>}
        </div>
      ) : (
        <>
          <div className="pm-phone__head"><div className="pm-avatar pm-avatar--sm">{m.fromName[0] === '+' ? '#' : m.fromName[0]}</div><strong>{name}</strong><small>SMS · jetzt</small></div>
          <div className="pm-phone__body">
            <div className="pm-bubble pm-pop">
              {m.body.map((p, i) => <span key={i}>{p} </span>)}
              {m.link && <button type="button" className="pm-link pm-link--inline" onClick={onLink}>{m.link.text}</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChatView({ m, ctx, onReady }) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(m.body.length); setTyping(false); onReady(); return undefined; }
    const timers = [];
    m.body.forEach((_, i) => {
      timers.push(setTimeout(() => setTyping(true), 300 + i * 1300));
      timers.push(setTimeout(() => { setTyping(false); setShown(i + 1); }, 1100 + i * 1300));
    });
    timers.push(setTimeout(onReady, 1300 + m.body.length * 1300));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const chats = [[m.fromName, m.external, true], [ctx.boss, false], ['Projektteam Q4', false], ['Lisa Kollegin', false]].filter((c, i, a) => a.findIndex(x => x[0] === c[0]) === i);
  return (
    <div className="tm">
      <div className="tm__rail" aria-hidden="true"><i className="is-active" /><i /><i /><i /><i /></div>
      <div className="tm__list" aria-hidden="true">
        <div className="tm__list-head">Chat</div>
        {chats.map(([n, ext, active]) => (
          <div key={n} className={`tm__chat${active ? ' is-active' : ''}`}><div className="pm-avatar pm-avatar--sm">{n[0]}</div><span>{n}{ext && <em> (Extern)</em>}</span></div>
        ))}
      </div>
      <div className="tm__main">
        <div className="tm__head"><div className="pm-avatar pm-avatar--sm">{m.fromName[0]}</div><strong>{m.fromName}</strong>
          {m.external ? <span className="pm-badge">Extern</span> : <span className="pm-badge pm-badge--int">{ctx.company}</span>}
          <span className="tm__tabs" aria-hidden="true"><b>Chat</b><span>Dateien</span></span>
        </div>
        {m.external && <div className="tm__warn">Diese Person ist außerhalb Ihrer Organisation. Seien Sie vorsichtig bei Links, Dateien und Anfragen nach Zugangsdaten.</div>}
        <div className="tm__msgs">
          {m.body.slice(0, shown).map((p, i) => (
            <div key={i} className="tm__msg pm-pop">{i === 0 && <span className="tm__meta">{m.fromName} · {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>}{p}</div>
          ))}
          {typing && shown < m.body.length && <div className="tm__typing" aria-label={`${m.fromName} schreibt`}><i /><i /><i /></div>}
        </div>
        <div className="tm__input">Neue Nachricht eingeben</div>
      </div>
    </div>
  );
}

function Profile({ ctx }) {
  const rows = [
    ['Chefin/Chef', ctx.boss, ctx.domain],
    ['Hausbank', ctx.bank, ctx.bankDomain],
    ['Lieferant', ctx.supplier, ctx.supplierDomain],
    ['Paketdienst', ctx.parcel, ctx.parcelDomain],
    ['Cloud-Speicher', ctx.cloud, ctx.cloudDomain],
    ['IT-Dienstleister', IT.name, IT.domain],
  ];
  return (
    <aside className="pmp" aria-label="Dein Profil">
      <div className="pmp__me">
        <div className="pm-avatar">MM</div>
        <div>
          <strong>Du bist Max Mustermann</strong>
          <span>Buchhaltung · {ctx.company} · <b>max.mustermann@{ctx.domain}</b></span>
        </div>
        <p className="pmp__hint">Bekannte Absender – prüfe jede Nachricht gegen diese Domains</p>
      </div>
      <ul className="pmp__grid">
        {rows.map(([role, name, domain]) => (
          <li key={role}><small>{role}</small><span>{name}</span><b>{domain}</b></li>
        ))}
      </ul>
    </aside>
  );
}

export default function PhishLab() {
  const [round, setRound] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [clicked, setClicked] = useState(false);
  const [score, setScore] = useState(0);
  const [ready, setReady] = useState(false);
  const [rid, setRid] = useState(0); // remount views per round
  const start = () => { setRound(newRound()); setI(0); setPicked(null); setClicked(false); setScore(0); setReady(false); setRid(r => r + 1); };
  const m = round?.msgs[i];
  const finished = round && i >= round.msgs.length;
  const decide = phish => { setPicked(phish); if (phish === m.phish) setScore(n => n + 1); };
  const next = () => { setI(n => n + 1); setPicked(null); setClicked(false); setReady(false); };
  const view = useMemo(() => m && ({ mail: MailView, sms: SmsView, chat: ChatView }[m.kind]), [m]);

  return (
    <>
      <section className="page-hero page-hero--short">
        <Scene3D variant="core" />
        <div className="page-hero__text">
          <Breadcrumbs route="phishing-training" title="Phishing-Training" />
          <p className="eyebrow">Phishing-Training</p>
          <h1 className="page-hero__title">Erkennen Sie den Betrug?</h1>
          <p className="page-hero__lead">Sie sind Max Mustermann. {ROUND} Nachrichten per E-Mail, SMS und Chat – echt oder Phishing? Jede Runde mit anderer Firma, anderen Domains und anderen Nachrichten. Alles simuliert, es werden keine Daten erfasst.</p>
        </div>
      </section>

      <section className="section tool phish pm">
        {!round && (
          <div className="phish__start">
            <h2>So funktioniert es</h2>
            <ul className="list">
              <li className="check check--check">Oben siehst du dein Profil mit allen bekannten Absendern und ihren Domains.</li>
              <li className="check check--check">Prüfe Absender, Linkziel (Maus darüber) und Anhänge – dann entscheide: Echt oder Phishing.</li>
              <li className="check check--check">Nach jeder Antwort siehst du, woran man es erkennt.</li>
            </ul>
            <button className="btn" onClick={start}>Training starten</button>
          </div>
        )}

        {round && !finished && (
          <div className="pm-layout">
            <Profile ctx={round.ctx} />
            <div className="pm-stage">
              <div className="pm-progress" aria-label={`Nachricht ${i + 1} von ${ROUND}`}>
                <span style={{ width: `${(i / ROUND) * 100}%` }} />
              </div>
              <p className="phish__progress">Nachricht {i + 1} von {ROUND} · {{ mail: 'E-Mail', sms: 'SMS', chat: 'Chat' }[m.kind]} · {score} richtig</p>
              {view && (() => { const V = view; return <V key={`${rid}-${i}`} m={m} ctx={round.ctx} onLink={() => setClicked(true)} onReady={() => setReady(true)} />; })()}

              {clicked && picked === null && (
                <div className="phish__warn" role="alert">
                  <strong>{m.phish ? 'Achtung – das wäre gefährlich gewesen!' : 'Hier war es harmlos – trotzdem gilt:'}</strong>
                  <p>Bei einem echten Angriff hätten Sie jetzt Zugangsdaten verraten oder Schadsoftware gestartet. Sofortmaßnahmen:</p>
                  <ol>
                    <li>Keine Daten eingeben, Fenster schließen.</li>
                    <li>Gerät vom Netzwerk trennen, wenn ein Anhang geöffnet wurde.</li>
                    <li>Sofort die IT bzw. den Support informieren.</li>
                    <li>Passwort von einem sicheren Gerät aus ändern.</li>
                  </ol>
                </div>
              )}

              {picked === null ? (
                <div className={`pm-decide${ready ? ' is-ready' : ''}`} aria-hidden={!ready || undefined}>
                  <button className="btn btn--ghost" disabled={!ready} onClick={() => decide(false)}>Echt</button>
                  <button className="btn" disabled={!ready} onClick={() => decide(true)}>Phishing</button>
                </div>
              ) : (
                <div className={`phish__answer ${picked === m.phish ? 'is-right' : 'is-wrong'}`} aria-live="polite">
                  <strong>{picked === m.phish ? 'Richtig!' : 'Leider falsch.'} Diese Nachricht ist {m.phish ? 'Phishing' : 'echt'}.</strong>
                  <p>{m.phish ? 'Woran man den Betrug erkennt:' : 'Warum sie vertrauenswürdig ist:'}</p>
                  <ul>{m.why.map(w => <li key={w}>{w}</li>)}</ul>
                  {picked !== m.phish && <p className="phish__more">Im Zweifel immer über einen zweiten, bekannten Kanal nachfragen – zum Beispiel per Rückruf auf die bekannte Nummer.</p>}
                  <button className="btn" onClick={next}>{i + 1 < ROUND ? 'Nächste Nachricht' : 'Zur Auswertung'}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {finished && (
          <div className="phish__end">
            <p className="eyebrow">Ihr Ergebnis</p>
            <h2>{score} von {ROUND} richtig erkannt</h2>
            <p>{score === ROUND ? 'Hervorragend – Sie lassen sich nicht so leicht täuschen. Wie sieht es bei Ihrem Team aus?' : score >= 6 ? 'Gut gemacht – aber schon eine einzige falsche Entscheidung reicht Angreifern. Wie gut ist Ihr Team vorbereitet?' : 'Phishing ist schwer zu erkennen – genau deshalb ist es so erfolgreich. Schulungen machen hier den größten Unterschied.'}</p>
            <div className="phish__offer">
              <h3>Phishing-Simulation für Ihr Team</h3>
              <p>Wir testen Ihre Mitarbeitenden mit realistischen, harmlosen Phishing-Mails und schulen gezielt dort, wo es nötig ist.</p>
              <div className="btn-row"><a className="btn" href="/termin">Beratung zur Phishing-Simulation</a><button className="btn btn--ghost" onClick={start}>Neue Runde (andere Nachrichten)</button></div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
