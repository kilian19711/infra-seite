import { useConsent, setConsent } from '../lib/consent';

/** First-visit consent banner. Both choices are equally prominent (no nudging), as required by GDPR/TTDSG. */
export default function CookieBanner() {
  const consent = useConsent();
  if (consent) return null;
  return (
    <div className="cookie" role="dialog" aria-modal="false" aria-labelledby="cookie-h">
      <div className="cookie__text">
        <strong id="cookie-h">Cookies</strong>
        <p>
          Für die Online-Terminbuchung nutzen wir HubSpot (Cookies, ggf. Übermittlung in die USA). Ohne Zustimmung
          bleibt alles andere voll nutzbar. <a href="/datenschutzinformation">Mehr erfahren</a>
        </p>
      </div>
      <div className="cookie__actions">
        <button className="btn btn--small btn--ghost" onClick={() => setConsent('necessary')}>Ablehnen</button>
        <button className="btn btn--small" onClick={() => setConsent('all')}>Akzeptieren</button>
      </div>
    </div>
  );
}
