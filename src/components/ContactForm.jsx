import { useState } from 'react';
import { ADDRESS, PHONE, PHONE_HREF } from '../data/site';
import { supabase } from '../lib/cms';

const INBOX = 'infrastructure@l-mobile.com';

const TOPICS = ['Allgemeine Anfrage', 'IT-Sicherheit', 'IT-Infrastruktur', 'Softwarelösungen', 'Schulen & Gemeinden', 'Support (Bestandskunde)'];

/** Inquiry form for new prospects ("Anfrageformular" in the assistant / support flow). */
export default function ContactForm() {
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async e => {
    e.preventDefault();
    const data = { ...Object.fromEntries(new FormData(e.target)), page: location.pathname };
    setBusy(true); setError(null);
    // Edge function "contact" mails the inquiry to the team; on failure the visitor keeps the text and gets a mail fallback.
    const { error: err } = supabase ? await supabase.functions.invoke('contact', { body: data }) : { error: 'offline' };
    setBusy(false);
    if (err) setError(data); else setSent(data);
  };
  const mailFallback = d => `mailto:${INBOX}?subject=${encodeURIComponent(`Website-Anfrage: ${d.topic} – ${d.name}`)}&body=${encodeURIComponent(`Name: ${d.name}\nFirma: ${d.company}\nE-Mail: ${d.email}\nTelefon: ${d.phone}\n\n${d.message}`)}`;
  return (
    <section className="section contact" id="anfrage" aria-labelledby="contact-h">
      <div className="contact__info">
        <p className="eyebrow">Kontakt</p>
        <h2 id="contact-h">Schreiben Sie uns.</h2>
        <p>Wir melden uns innerhalb eines Werktags. Für dringende Support-Fälle rufen Sie uns bitte direkt an.</p>
        <dl>
          <div><dt>Telefon</dt><dd><a href={PHONE_HREF}>{PHONE}</a></dd></div>
          <div><dt>Erreichbar</dt><dd>Mo–Fr, 08:00–17:00 Uhr</dd></div>
          <div><dt>Adresse</dt><dd>{ADDRESS.street}<br />{ADDRESS.city}</dd></div>
        </dl>
      </div>
      {sent ? (
        <div className="booking__done" role="status">
          <p className="eyebrow">Anfrage gesendet</p>
          <h3>Danke, {sent.name}!</h3>
          <p>Wir haben Ihre Anfrage zum Thema „{sent.topic}“ erhalten und melden uns innerhalb eines Werktags unter {sent.email}.</p>
          <button className="btn btn--ghost" onClick={() => setSent(null)}>Neue Anfrage</button>
        </div>
      ) : (
        <form className="booking__form" onSubmit={submit}>
          <div className="fields">
            <label>Name<input name="name" required autoComplete="name" /></label>
            <label>Firma / Schule<input name="company" autoComplete="organization" /></label>
            <label>E-Mail<input name="email" type="email" required autoComplete="email" /></label>
            <label>Telefon<input name="phone" type="tel" autoComplete="tel" /></label>
            <label className="fields__wide">Thema
              <select name="topic">{TOPICS.map(t => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="fields__wide">Ihre Nachricht<textarea name="message" rows="5" required /></label>
            <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <label className="fields__wide check"><input type="checkbox" required /> Ich habe die <a href="/datenschutzinformation">Datenschutzinformation</a> gelesen.</label>
          </div>
          {error && <p className="form-error" role="alert">Das hat leider nicht geklappt. Bitte <a href={mailFallback(error)}>per E-Mail senden</a> (Text ist schon ausgefüllt) oder anrufen: <a href={PHONE_HREF}>{PHONE}</a>.</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Wird gesendet …' : 'Anfrage senden'}</button>
        </form>
      )}
    </section>
  );
}
