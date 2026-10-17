import { useMemo, useState } from 'react';
import { Breadcrumbs } from '../components/Wayfinding';
import Scene3D from '../components/Scene3D';

function ToolHero({ route, eyebrow, title, lead }) {
  return (
    <section className="page-hero page-hero--short">
      <Scene3D variant="core" />
      <div className="page-hero__text">
        <Breadcrumbs route={route} title={title} />
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-hero__title">{title}</h1>
        <p className="page-hero__lead">{lead}</p>
      </div>
    </section>
  );
}

/* ================= Idee 8: Schnell-Check ================= */
const QUESTIONS = [
  ['Organisation', 'Gibt es einen Verantwortlichen für IT-Sicherheit und dokumentierte Regeln?'],
  ['Zugriffsrechte', 'Nutzen alle – besonders Administratoren – Multi-Faktor-Authentifizierung?'],
  ['E-Mail-Sicherheit', 'Sind Mitarbeitende für Phishing sensibilisiert und ist ein Schutz für Anhänge aktiv?'],
  ['Datensicherung', 'Gibt es Backups, die regelmäßig getestet und getrennt gespeichert werden?'],
  ['Operational Security', 'Werden Updates und Patches zeitnah und systematisch eingespielt?'],
  ['Technische Sicherheit', 'Sind Firewall, Netzwerktrennung und Endpoint-Schutz aktuell?'],
];
const ANSWERS = [['Ja', 2], ['Teilweise', 1], ['Nein / weiß nicht', 0]];

// Thresholds from the concept: 0–4 high need, 5–8 gaps, 9–12 good basis.
export const rating = score =>
  score <= 4 ? { level: 'red', title: 'Hoher Handlungsbedarf', text: 'In mehreren Kernbereichen fehlen grundlegende Schutzmaßnahmen. Ein Angriff hätte gute Chancen. Wir empfehlen, kurzfristig einen Cybersecurity-Check durchzuführen.' }
  : score <= 8 ? { level: 'yellow', title: 'Lücken erkennbar', text: 'Eine Basis ist vorhanden, aber einzelne Bereiche sind offen. Genau dort setzen Angreifer an. Der Cybersecurity-Check zeigt, welche Lücken Sie zuerst schließen sollten.' }
  : { level: 'green', title: 'Gute Basis – lassen Sie sie bestätigen', text: 'Sie sind gut aufgestellt. Ein externer Blick bestätigt das und findet die letzten blinden Flecken – oft ist genau das für Versicherung und Geschäftsführung wichtig.' };

console.assert(rating(0).level === 'red' && rating(4).level === 'red' && rating(5).level === 'yellow' && rating(8).level === 'yellow' && rating(9).level === 'green' && rating(12).level === 'green', 'rating thresholds');

export function QuickCheck() {
  const [answers, setAnswers] = useState({});
  const done = Object.keys(answers).length === QUESTIONS.length;
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const r = rating(score);
  return (
    <>
      <ToolHero route="schnell-check" eyebrow="OZELOT-Test · 2 Minuten" title="Wie sicher ist Ihr Unternehmen?" lead="Sechs Fragen zu den Kernbereichen unserer OZELOT-Methode. Sie erhalten sofort eine Ampel-Einschätzung und eine Empfehlung. Es werden keine Daten gespeichert oder übertragen." />
      <section className="section tool">
        <ol className="qc">
          {QUESTIONS.map(([area, q], i) => (
            <li key={area} className="qc__item">
              <fieldset>
                <legend><span className="qc__area">{i + 1}. {area}</span>{q}</legend>
                <div className="chips">
                  {ANSWERS.map(([label, pts]) => (
                    <button type="button" key={label} className="chip" aria-pressed={answers[i] === pts} onClick={() => setAnswers(a => ({ ...a, [i]: pts }))}>{label}</button>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <div className={`qc__result${done ? ` qc__result--${r.level}` : ''}`} aria-live="polite">
          {done ? (
            <>
              <div className="ampel" aria-hidden="true"><i className={r.level === 'red' ? 'on' : ''} /><i className={r.level === 'yellow' ? 'on' : ''} /><i className={r.level === 'green' ? 'on' : ''} /></div>
              <div>
                <p className="eyebrow">{score} von 12 Punkten</p>
                <h2>{r.title}</h2>
                <p>{r.text}</p>
                <div className="btn-row"><a className="btn" href="/termin">Cybersecurity-Check vereinbaren</a><a className="btn btn--ghost" href="/it-sicherheit">Mehr zur OZELOT-Methode</a></div>
              </div>
            </>
          ) : (
            <p>Noch {QUESTIONS.length - Object.keys(answers).length} Fragen bis zu Ihrem Ergebnis.</p>
          )}
        </div>
        <p className="tool__note">Unverbindliche Selbsteinschätzung – ersetzt keine Prüfung. Die Schwellen sind Richtwerte.</p>
      </section>
    </>
  );
}

/* ================= Idee 9: Kostenrechner ================= */
export const outageCost = ({ staff, rate, hours, share }) => Math.round(staff * rate * hours * (share / 100));
console.assert(outageCost({ staff: 50, rate: 60, hours: 8, share: 100 }) === 24000, 'outageCost example from concept');

const eur = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const clampNum = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

export function CostCalc() {
  const [v, setV] = useState({ staff: 50, rate: 60, hours: 8, share: 100 });
  const day = useMemo(() => outageCost(v), [v]);
  const field = (key, label, min, max, step, suffix) => (
    <label className="calc__field">
      <span>{label}</span>
      <div className="calc__input">
        <input type="number" inputMode="numeric" min={min} max={max} step={step} value={v[key]}
          onChange={e => setV(s => ({ ...s, [key]: clampNum(e.target.value, min, max) }))} />
        <em>{suffix}</em>
      </div>
      <input type="range" min={min} max={max} step={step} value={v[key]} aria-label={label}
        onChange={e => setV(s => ({ ...s, [key]: +e.target.value }))} />
    </label>
  );
  return (
    <>
      <ToolHero route="ausfallkosten" eyebrow="Kostenrechner" title="Was kostet ein Ausfalltag?" lead="Wenn Systeme stillstehen, wird es teuer. Rechnen Sie in 30 Sekunden aus, was ein IT-Ausfall Ihr Unternehmen pro Tag kostet." />
      <section className="section tool calc">
        <div className="calc__inputs">
          {field('staff', 'Mitarbeitende', 1, 2000, 1, 'Pers.')}
          {field('rate', 'Durchschnittlicher Stundensatz', 10, 250, 5, '€ / Std.')}
          {field('hours', 'Arbeitsstunden pro Tag', 1, 24, 1, 'Std.')}
          {field('share', 'Anteil betroffener Mitarbeitender', 10, 100, 10, '%')}
        </div>
        <div className="calc__result" aria-live="polite">
          <p className="eyebrow">Geschätzte Kosten</p>
          <strong>{eur(day)}</strong>
          <span>pro Ausfalltag</span>
          <dl>
            <div><dt>3 Tage Stillstand</dt><dd>{eur(day * 3)}</dd></div>
            <div><dt>1 Woche (5 Tage)</dt><dd>{eur(day * 5)}</dd></div>
          </dl>
          <p className="calc__formula">{v.staff} × {v.rate} € × {v.hours} Std. × {v.share} %</p>
          <a className="btn" href="/termin">Ausfallrisiko senken – Beratung buchen</a>
        </div>
        <div className="calc__assumptions">
          <h2 className="h3">Offen angezeigte Annahmen</h2>
          <ul className="list">
            <li className="check check--dot">Berechnet wird nur die verlorene Arbeitszeit (Mitarbeitende × Stundensatz × Stunden × Anteil).</li>
            <li className="check check--dot">Arbeitstag und betroffener Anteil sind anpassbar; Standard ist kompletter Stillstand.</li>
            <li className="check check--cancel">Nicht enthalten: Wiederherstellung, Datenverlust, Vertragsstrafen, Bußgelder und Reputationsschaden.</li>
            <li className="check check--dot">Ausdrücklich eine Schätzung – die realen Kosten liegen meist höher.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
