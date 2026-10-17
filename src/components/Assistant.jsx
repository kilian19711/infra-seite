import { useEffect, useRef, useState } from 'react';
import { isSupportOpen, PHONE, PHONE_HREF, TICKET_URL, team } from '../data/site';

/*
 * Idee 1: assistant bottom right. It orients and hands over (hotline, form, phone) instead of doing support.
 * ponytail: rule-based keyword routing, no LLM. Swap `answer()` for an API call to a real agent later;
 * the UI (messages + action buttons) stays the same.
 */
const TOPICS = [
  [/sicher|hack|angriff|virus|ransom|firewall|cyber|phish/i, 'Zum Thema IT-Sicherheit: Machen Sie unseren Schnell-Check oder buchen Sie direkt den Cybersecurity-Check.', [['Schnell-Check starten', '/schnell-check'], ['IT-Sicherheit', '/it-sicherheit']]],
  [/schul|gemeinde|digitalpakt|förder|logodidact/i, 'Für Schulen und Gemeinden ist Torsten Ebert Ihr Ansprechpartner (Digitalpakt 2.0, Förderungen).', [['Schul-IT ansehen', '/digitalisierung-von-schulen'], ['Termin mit Torsten', '/termin']]],
  [/server|netzwerk|wlan|telefon|voip|swyx|montage|kabel/i, 'Netzwerk, Server, WLAN und Telefonie planen und installieren wir mit eigenem Team.', [['IT-Infrastruktur', '/it-infrastruktur'], ['Beratung buchen', '/termin']]],
  [/baramundi|endger|desktop|elo|dokument|microsoft|365|azure|cloud/i, 'Bei Software wie baramundi, ELO oder Microsoft 365 hilft Ihnen Luca Layher weiter.', [['Softwarelösungen', '/softwareloesungen'], ['Termin buchen', '/termin']]],
  [/kost|preis|ausfall|was kostet/i, 'Was ein Ausfalltag Ihr Unternehmen kostet, zeigt unser Rechner in 30 Sekunden.', [['Ausfallkosten berechnen', '/ausfallkosten']]],
  [/job|karriere|bewerb|stelle/i, 'Offene Stellen finden Sie auf unserer Karriereseite.', [['Karriere', '/ueber-uns/karriere']]],
  [/termin|beratung|gespräch|angebot/i, 'Gern! Wählen Sie Ihren Wunschtermin direkt online.', [['Termin buchen', '/termin']]],
];

function answer(text) {
  const hit = TOPICS.find(([re]) => re.test(text));
  return hit
    ? { text: hit[1], actions: hit[2] }
    : { text: 'Dazu verbinde ich Sie am besten mit einem Menschen. Wie möchten Sie weitermachen?', actions: null };
}

const handover = live => [
  ...(live ? [['Support-Hotline anrufen', PHONE_HREF]] : []),
  ['Ticket erstellen (Bestandskunden)', TICKET_URL || '/kontakt'],
  ['Anfrage senden (Neukunden)', '/kontakt'],
  [`Vertrieb anrufen · ${PHONE}`, PHONE_HREF],
];

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const greeting = () => [{ from: 'bot', text: 'Hallo! Ich helfe Ihnen, schnell den richtigen Weg zu finden. Worum geht es?', actions: null, start: true }];
  const [msgs, setMsgs] = useState(greeting);
  const [input, setInput] = useState('');
  const list = useRef(null);
  const live = isSupportOpen();

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs, open]);

  const send = text => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'me', text }, { from: 'bot', ...answer(text) }]);
    setInput('');
  };
  const pick = (label, reply) => setMsgs(m => [...m, { from: 'me', text: label }, { from: 'bot', ...reply }]);

  return (
    <div className={`assistant${open ? ' is-open' : ''}`}>
      {open && (
        <section className="assistant__panel" role="dialog" aria-label="Assistent">
          <header>
            <strong>L-mobile Assistent</strong>
            <span>{live ? 'Support erreichbar' : 'Support ab Mo 08:00'}</span>
            <button aria-label="Schließen" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="assistant__list" ref={list} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`msg msg--${m.from}`}>
                <p>{m.text}</p>
                {m.start && (
                  <div className="msg__actions">
                    <button onClick={() => pick('Ich bin Bestandskunde und brauche Hilfe', { text: 'Für Bestandskunden gibt es drei Wege:', actions: handover(live) })}>Ich brauche Support</button>
                    <button onClick={() => pick('Ich interessiere mich für eine Leistung', { text: 'Gern – wofür interessieren Sie sich? Schreiben Sie ein Stichwort (z. B. „Firewall“, „Schule“, „Server“) oder wählen Sie:', actions: [['IT-Sicherheit', '/it-sicherheit'], ['IT-Infrastruktur', '/it-infrastruktur'], ['Softwarelösungen', '/softwareloesungen'], ['Schulen & Gemeinden', '/digitalisierung-von-schulen']] })}>Ich interessiere mich für eine Leistung</button>
                    <button onClick={() => pick('Ich suche einen Ansprechpartner', { text: team.map(t => `${t.name} – ${t.role}`).join('\n'), actions: [['Termin buchen', '/termin'], ['Alle Ansprechpartner', '/ueber-uns']] })}>Ansprechpartner finden</button>
                  </div>
                )}
                {m.from === 'bot' && !m.start && (
                  <div className="msg__actions">
                    {(m.actions || handover(live)).map(([label, href]) => (
                      <a key={label} href={href} onClick={() => href.startsWith('/') && (setOpen(false), setMsgs(greeting()), setInput(''))}>{label}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form className="assistant__form" onSubmit={e => { e.preventDefault(); send(input); }}>
            <label className="sr-only" htmlFor="assistant-input">Ihre Frage</label>
            <input id="assistant-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Frage oder Stichwort …" autoComplete="off" />
            <button className="btn btn--small" type="submit">Senden</button>
          </form>
          <small className="assistant__note">Automatischer Assistent – leitet Sie an die richtige Stelle weiter.</small>
        </section>
      )}
      <button className="assistant__toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? 'Schließen' : 'Fragen? Wir helfen'}
      </button>
    </div>
  );
}
