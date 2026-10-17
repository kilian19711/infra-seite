import { Breadcrumbs } from '../components/Wayfinding';
import ContactBox from '../components/ContactBox';
import Scene3D from '../components/Scene3D';

/* Own product page for ProfileStudio (developed by L-mobile infrastructure). Summary in our own words;
   prices, purchase and full feature list stay on profilestudio.de. */
const ROUTE = 'softwareloesungen/profilestudio';
const SITE = 'https://profilestudio.de';

const FEATURES = [
  ['Über 100 Einstellungsbereiche', 'Einschränkungen, WLAN, VPN, Zertifikate und mehr – per Formular statt in Konfigurationsdateien.'],
  ['Homescreen per Drag & Drop', 'Apps, Ordner, Dock und Web-Clips visuell anordnen, so wie sie später auf dem Gerät erscheinen.'],
  ['Prüfung in Echtzeit', 'Pflichtfelder und Abhängigkeiten werden sofort geprüft – inklusive Hinweisen für betreute Geräte.'],
  ['Bestehende Profile importieren', 'Vorhandene Profile öffnen und weiterbearbeiten, ohne dass Einstellungen verloren gehen.'],
  ['Für jedes MDM-System', 'Export im Standardformat für baramundi, Jamf Pro, Microsoft Intune und andere – optional mit baramundi-Variablen.'],
  ['Dokumentation inklusive', 'Profilbericht als HTML oder PDF mit eigenem Logo – ideal für Freigaben und Nachweise.'],
];
const AUDIENCE = ['IT-Abteilungen mit iPhones, iPads oder Macs', 'Schulen, die iPads für Klassen einrichten', 'Systemhäuser und Dienstleister mit mehreren Kunden'];

export default function ProfileStudioPage() {
  return (
    <>
      <section className="page-hero">
        <Scene3D variant="lattice" />
        <div className="page-hero__text">
          <Breadcrumbs route={ROUTE} title="ProfileStudio" />
          <p className="eyebrow">Eigene Softwarelösung</p>
          <h1 className="page-hero__title">ProfileStudio – Apple-Profile einfach erstellen</h1>
          <p className="page-hero__lead">Konfigurationsprofile für iPhone, iPad, Mac und weitere Apple-Geräte visuell erstellen, prüfen und exportieren – unter Windows, ohne Programmierkenntnisse. Entwickelt von L-mobile infrastructure.</p>
          <div className="page-hero__cta">
            <a className="btn" href={SITE} target="_blank" rel="noopener noreferrer">Zu profilestudio.de</a>
            <a className="btn btn--ghost" href="/termin">Vorführung vereinbaren</a>
          </div>
        </div>
      </section>

      <section className="section section--tight"><ContactBox route={ROUTE} /></section>

      <section className="section">
        <div className="section__head">
          <p className="eyebrow">Funktionen</p>
          <h2 className="reveal">Profile per Klick statt per Hand</h2>
        </div>
        <div className="grid grid--cards stagger">
          {FEATURES.map(([t, d]) => <article key={t} className="tool-card"><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="section section--alt ps-split">
        <div>
          <p className="eyebrow">Für wen</p>
          <h2 className="h3">Ideal für</h2>
          <ul className="list">{AUDIENCE.map(a => <li key={a} className="check check--check">{a}</li>)}</ul>
        </div>
        <div>
          <p className="eyebrow">Datenschutz</p>
          <h2 className="h3">Läuft komplett lokal</h2>
          <p>Kein Cloud-Konto, keine Telemetrie: Profile werden auf Ihrem Rechner erstellt und exportiert – auch offline.</p>
          <p>Passt perfekt zu <a href="/softwareloesungen/desktop-management-software">baramundi</a>, das wir bei Ihnen einführen und betreuen.</p>
        </div>
      </section>

      <section className="section cta reveal">
        <h2>Lizenz, Preise und alle Details</h2>
        <p>Alle Informationen und den Kauf finden Sie direkt auf der Produktseite.</p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <a className="btn" href={SITE} target="_blank" rel="noopener noreferrer">profilestudio.de öffnen</a>
          <a className="btn btn--ghost" href="/termin">Termin vereinbaren</a>
        </div>
      </section>
    </>
  );
}
