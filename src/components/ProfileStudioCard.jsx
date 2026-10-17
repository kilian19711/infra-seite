/** Small teaser for L-mobile infrastructure's own product ProfileStudio – details live on profilestudio.de. */
export default function ProfileStudioCard() {
  return (
    <aside className="ps-card" aria-labelledby="ps-h">
      <div className="ps-card__text">
        <small>Eigene Softwarelösung</small>
        <h3 id="ps-h">ProfileStudio</h3>
        <p>Konfigurationsprofile für iPhone, iPad und Mac per Klick erstellen statt von Hand – für baramundi, Jamf, Intune und andere MDM-Systeme. Läuft lokal unter Windows, ohne Cloud.</p>
      </div>
      <div className="btn-row"><a className="btn btn--small" href="/softwareloesungen/profilestudio">Mehr erfahren</a><a className="btn btn--small btn--ghost" href="https://profilestudio.de" target="_blank" rel="noopener noreferrer">profilestudio.de</a></div>
    </aside>
  );
}
