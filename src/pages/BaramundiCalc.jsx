import { useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Wayfinding';
import ContactBox from '../components/ContactBox';

/*
 * Hidden page (not in the navigation): what manual client maintenance costs vs. automation with baramundi.
 * All values are editable assumptions; no licence prices are invented (optional field, empty by default).
 */
export const clientSavings = ({ clients, minutes, rate, automation, licence }) => {
  const manualHours = (clients * minutes * 12) / 60;
  const savedHours = manualHours * (automation / 100);
  const savedEuro = savedHours * rate;
  const licenceEuro = clients * (licence || 0);
  return { manualHours, savedHours, manualEuro: manualHours * rate, savedEuro, net: savedEuro - licenceEuro, fte: savedHours / 1600 };
};
// Self-check: 300 clients × 45 min/month = 2,700 h/year; 80 % automated = 2,160 h saved; × 60 € = 129,600 €.
console.assert(Math.round(clientSavings({ clients: 300, minutes: 45, rate: 60, automation: 80, licence: 0 }).savedEuro) === 129600, 'baramundi calc');

const eur = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const num = n => Math.round(n).toLocaleString('de-DE');
const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

export default function BaramundiCalc() {
  const [v, setV] = useState({ clients: 300, minutes: 45, rate: 60, automation: 80, licence: '' });
  const r = useMemo(() => clientSavings(v), [v]);
  const field = (key, label, min, max, step, suffix, hint) => (
    <label className="calc__field">
      <span>{label}</span>
      <div className="calc__input">
        <input type="number" inputMode="numeric" min={min} max={max} step={step} value={v[key]} placeholder={key === 'licence' ? 'optional' : undefined}
          onChange={e => setV(s => ({ ...s, [key]: e.target.value === '' && key === 'licence' ? '' : clamp(e.target.value, min, max) }))} />
        <em>{suffix}</em>
      </div>
      {key !== 'licence' && <input type="range" min={min} max={max} step={step} value={v[key]} aria-label={label} onChange={e => setV(s => ({ ...s, [key]: +e.target.value }))} />}
      {hint && <small className="calc__hint">{hint}</small>}
    </label>
  );
  return (
    <>
      <section className="page-hero page-hero--short">
        <div className="page-hero__text">
          <Breadcrumbs route="softwareloesungen/desktop-management-software" title="baramundi-Ersparnisrechner" />
          <p className="eyebrow">baramundi · Ersparnisrechner</p>
          <h1 className="page-hero__title">Was kostet Sie die Wartung Ihrer Clients von Hand?</h1>
          <p className="page-hero__lead">Updates, Patches, Software-Installationen – jedes Gerät einzeln betreuen kostet Zeit. Rechnen Sie aus, wie viel Sie mit automatisiertem Client Management durch die baramundi Management Suite sparen.</p>
        </div>
      </section>
      <section className="section tool calc">
        <div className="calc__inputs">
          {field('clients', 'Anzahl Clients (PCs, Notebooks, Server)', 10, 5000, 10, 'Geräte')}
          {field('minutes', 'Manueller Aufwand pro Client und Monat', 5, 240, 5, 'Min.', 'Updates, Patches, Softwareverteilung, Inventur, kleine Störungen')}
          {field('rate', 'Kosten einer IT-Stunde (intern oder extern)', 30, 200, 5, '€ / Std.')}
          {field('automation', 'Davon automatisierbar mit baramundi', 30, 95, 5, '%', 'Annahme – in Projekten typischerweise ein Großteil der Routinearbeit')}
          {field('licence', 'Lizenzkosten pro Client und Jahr', 0, 500, 1, '€ / Jahr', 'Optional – Preise erhalten Sie von uns im Angebot')}
        </div>
        <div className="calc__result" aria-live="polite">
          <p className="eyebrow">Ersparnis pro Jahr</p>
          <strong>{eur(v.licence ? r.net : r.savedEuro)}</strong>
          <span>{v.licence ? 'nach Lizenzkosten' : 'vor Lizenzkosten'}</span>
          <dl>
            <div><dt>Aufwand heute (von Hand)</dt><dd>{num(r.manualHours)} Std. · {eur(r.manualEuro)}</dd></div>
            <div><dt>Gesparte Arbeitszeit</dt><dd>{num(r.savedHours)} Std.</dd></div>
            <div><dt>Entspricht etwa</dt><dd>{r.fte.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Vollzeitstellen</dd></div>
          </dl>
          <div className="btn-row"><a className="btn" href="/termin">Ergebnis mit uns besprechen</a><a className="btn btn--ghost" href="/software-demo/baramundi-kostenlose-30-tage-testversion">30 Tage kostenlos testen</a></div>
        </div>
        <div className="calc__assumptions">
          <h2 className="h3">So rechnen wir</h2>
          <ul className="list">
            <li className="check check--dot">Aufwand heute = Clients × Minuten pro Monat × 12 Monate.</li>
            <li className="check check--dot">Ersparnis = Aufwand heute × automatisierbarer Anteil × Stundensatz.</li>
            <li className="check check--dot">Eine Vollzeitstelle entspricht hier rund 1.600 produktiven Stunden im Jahr.</li>
            <li className="check check--cancel">Nicht enthalten: geringeres Sicherheitsrisiko durch schnellere Patches, weniger Ausfälle, bessere Lizenzübersicht – der tatsächliche Nutzen liegt meist höher.</li>
            <li className="check check--dot">Unverbindliche Schätzung auf Basis Ihrer Eingaben.</li>
          </ul>
        </div>
      </section>
      <section className="section"><ContactBox route="baramundi-rechner" /></section>
    </>
  );
}
