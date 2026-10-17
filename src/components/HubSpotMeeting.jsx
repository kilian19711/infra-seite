import { useEffect, useState } from 'react';
import { useConsent, setConsent, resetConsent } from '../lib/consent';

// Firefox' tracking protection often blocks the HubSpot frame (stays blank) – offer the new-tab version prominently.
const FIREFOX = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
import { HUBSPOT_MEETING_URL, CALENDARS, PHONE, PHONE_HREF } from '../data/site';

/**
 * HubSpot meetings calendar, embedded as a plain iframe (no HubSpot script → no load race, works across SPA
 * navigation). Only rendered after consent ('all'); shows a loading state and always a "open in new tab" fallback
 * for browsers that block third-party frames.
 */
export default function HubSpotMeeting({ standalone = false }) {
  const consent = useConsent();
  const [loaded, setLoaded] = useState(false);
  const [who, setWho] = useState(() => new URLSearchParams(location.search).get('mit') || '');
  const url = CALENDARS.find(c => c.key === who)?.url || HUBSPOT_MEETING_URL;
  const pick = key => { setWho(key); setLoaded(false); };
  // Help (new tab, cookies) only appears if the frame has not reported loading after a few seconds.
  const [slow, setSlow] = useState(false);
  useEffect(() => { setSlow(false); const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t); }, [url, consent]);
  const Heading = standalone ? 'h1' : 'h2';
  const directUrl = url.replace(/[?&]embed=true/, '');

  return (
    <section id="termin" className={`section booking${standalone ? ' booking--standalone' : ''}`}>
      <p className="eyebrow">Termin vereinbaren</p>
      <Heading className="h2">30 Minuten, die sich lohnen.</Heading>
      <p>Wählen Sie direkt einen freien Termin – kostenlos und unverbindlich, per Telefon oder Teams.</p>
      <div className="booking__who" role="group" aria-label="Gesprächspartner wählen">
        {CALENDARS.map(c => <button key={c.key} type="button" className={`chip${url === c.url ? ' is-active' : ''}`} aria-pressed={url === c.url} onClick={() => pick(c.key)}>{c.name}</button>)}
      </div>
      {consent === 'all' ? (
        <>
          <div className={`hubspot-box${loaded ? ' is-loaded' : ''}`}>
            {!loaded && <div className="hubspot-loading" role="status"><span className="hubspot-spinner" aria-hidden="true" />Kalender wird geladen …</div>}
            <iframe key={url} src={url} title="Terminbuchung über HubSpot" onLoad={() => setLoaded(true)} />
          </div>
          {slow && !loaded && <>
          {FIREFOX && <p className="hubspot-note">Firefox blockiert den eingebetteten Kalender häufig. Falls er leer bleibt, öffnen Sie ihn einfach in einem neuen Tab.</p>}
          <div className="btn-row hubspot-actions">
            <a className="btn btn--small btn--ghost" href={directUrl} target="_blank" rel="noopener noreferrer">Kalender in neuem Tab öffnen</a>
            <a className="btn btn--small btn--ghost" href={PHONE_HREF}>Anrufen: {PHONE}</a>
            <button type="button" className="btn btn--small btn--ghost" onClick={resetConsent}>Cookie-Einstellungen</button>
          </div>
          </>}
        </>
      ) : (
        <div className="hubspot-consent">
          <strong>Kalender wird erst nach Ihrer Zustimmung geladen</strong>
          <p>Für die Terminauswahl binden wir den Kalender von HubSpot ein. Dabei werden Cookies gesetzt und Daten können in die USA übertragen werden.</p>
          <div className="btn-row">
            <button className="btn" onClick={() => setConsent('all')}>Zustimmen und Kalender laden</button>
            <a className="btn btn--ghost" href={directUrl} target="_blank" rel="noopener noreferrer">Kalender extern öffnen</a>
            <a className="btn btn--ghost" href={PHONE_HREF}>Anrufen: {PHONE}</a>
          </div>
        </div>
      )}
    </section>
  );
}
