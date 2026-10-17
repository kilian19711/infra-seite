import { ADDRESS } from '../data/site';
import { HQ, KM_PER_DEG, GERMANY_PATH } from '../data/germany';

/*
 * Idee 10: Standort & Einsatzgebiet. Self-drawn SVG (Natural Earth outline, no map service → no cookie banner).
 * Units are kilometres around Gartenstraße 51. GSAP (App.jsx) animates the viewBox from all of Germany down to
 * the 100 km service area while scrolling; far labels fade out, region labels fade in.
 */
export const VIEW_GERMANY = '-390 -700 920 920';
export const VIEW_REGION = '-125 -125 250 250';
const RADIUS_KM = 100;

const km = (lat, lon) => [(lon - HQ.lon) * KM_PER_DEG.x, -(lat - HQ.lat) * KM_PER_DEG.y];
// NASA/USGS Landsat WELD + ASTER relief (public domain), EPSG:4326 → linear in lon/lat, so a plain rectangle in km lines up exactly.
const imageBox = ([lonMin, latMin, lonMax, latMax]) => {
  const [x0, y0] = km(latMax, lonMin), [x1, y1] = km(latMin, lonMax);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};
const IMG_DE = imageBox([4.5, 46.0, 16.5, 56.0]);
const IMG_REGION = imageBox([7.70, 48.10, 11.28, 49.90]);
const dist = ([x, y]) => Math.hypot(x, y);

// Largest cities for orientation in the Germany view.
const FAR = [['Berlin', 52.52, 13.405], ['Hamburg', 53.551, 9.994], ['München', 48.137, 11.575], ['Köln', 50.938, 6.96], ['Frankfurt', 50.11, 8.682]];
// Cities in and around the service area (Großstädte bold).
const NEAR = [
  ['Stuttgart', 48.776, 9.183, true, 'l'], ['Heilbronn', 49.142, 9.219, true, 'l'], ['Karlsruhe', 49.007, 8.404, true, 'l'],
  ['Mannheim', 49.488, 8.466, true, 'l'], ['Heidelberg', 49.399, 8.672, true, 'l'], ['Pforzheim', 48.892, 8.695, true, 'l'],
  ['Ulm', 48.401, 9.988, true, 'r'], ['Reutlingen', 48.491, 9.204, true, 'r'], ['Würzburg', 49.791, 9.953, true, 'r'],
  ['Ludwigsburg', 48.894, 9.193, false, 't'], ['Esslingen', 48.74, 9.307, false, 'b'], ['Tübingen', 48.52, 9.056, false, 'l'],
  ['Schwäbisch Hall', 49.112, 9.737, false, 'r'], ['Aalen', 48.837, 10.093, false, 'r'], ['Schwäbisch Gmünd', 48.8, 9.798, false, 'b'],
].map(([name, lat, lon, big, side]) => ({ name, big, side, p: km(lat, lon) })).filter(c => dist(c.p) <= RADIUS_KM + 2);

// Pill geometry relative to the city dot for each label side.
const pill = (name, fs, side) => {
  const w = name.length * fs * 0.56 + 3.6, h = fs * 1.7, gap = 2.6;
  const box = { r: [gap, -h / 2], l: [-gap - w, -h / 2], t: [-w / 2, -gap - h], b: [-w / 2, gap] }[side];
  return { x: box[0], y: box[1], w, h, tx: box[0] + w / 2, ty: box[1] + h / 2 + fs * 0.36 };
};
console.assert(NEAR.length >= 12 && NEAR.some(c => c.name === 'Stuttgart'), 'region cities within 100 km');

export default function RegionMap() {
  const routeUrl = `https://www.openstreetmap.org/directions?to=${HQ.lat}%2C${HQ.lon}`;
  return (
    <section className="section region" aria-labelledby="region-h">
      <div className="region__text">
        <p className="eyebrow">Standort & Einsatzgebiet</p>
        <h2 id="region-h">Aus Sulzbach an der Murr für die ganze Region.</h2>
        <p>Wir betreuen Unternehmen, Schulen und Gemeinden im Umkreis von rund {RADIUS_KM} Kilometern – von Stuttgart über Heilbronn bis Karlsruhe, Ulm und Würzburg. Gespräche führen wir per Telefon oder Teams und auf Wunsch natürlich vor Ort.</p>
        <address>
          <strong>L-mobile infrastructure GmbH &amp; Co. KG</strong><br />
          {ADDRESS.street}<br />{ADDRESS.city}
        </address>
        <div className="btn-row">
          <a className="btn" href="/termin">Termin vereinbaren</a>
          <a className="btn btn--ghost" href={routeUrl} target="_blank" rel="noreferrer">Route planen</a>
        </div>
      </div>
      <div className="region__map" role="img"
        aria-label={`Karte von Deutschland mit Zoom auf Sulzbach an der Murr. Einsatzgebiet ${RADIUS_KM} km mit ${NEAR.filter(c => c.big).map(c => c.name).join(', ')}.`}>
        <svg className="region__svg" viewBox={VIEW_REGION} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="area-fill">
              <stop offset="0" stopColor="#009acd" stopOpacity="0.05" />
              <stop offset="0.85" stopColor="#009acd" stopOpacity="0.16" />
              <stop offset="1" stopColor="#4cc9f0" stopOpacity="0.32" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <image href="/img/map/landsat-de.jpg" {...IMG_DE} preserveAspectRatio="none" />
          <g className="region__detail">
            <image href="/img/map/landsat-region.jpg" {...IMG_REGION} preserveAspectRatio="none" />
            <image className="region__relief" href="/img/map/relief-region.jpg" {...IMG_REGION} preserveAspectRatio="none" />
          </g>
          <path className="region__de" d={GERMANY_PATH} />
          <circle className="region__area" r={RADIUS_KM} fill="url(#area-fill)" filter="url(#glow)" />

          <g className="region__far">
            {FAR.map(([name, lat, lon]) => {
              const [x, y] = km(lat, lon);
              return (
                <g key={name} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                  <rect className="pill" x="10" y="-13" width={name.length * 13 + 16} height="26" rx="13" />
                  <circle r="5" /><text x="18" y="6" fontSize="17">{name}</text>
                </g>
              );
            })}
          </g>

          <g className="region__near">
            {NEAR.map(c => {
              const fs = c.big ? 4.4 : 3.7;
              const b = pill(c.name, fs, c.side);
              return (
                <g key={c.name} transform={`translate(${c.p[0].toFixed(1)} ${c.p[1].toFixed(1)})`} className={c.big ? 'is-big' : ''}>
                  <rect className="pill" x={b.x.toFixed(1)} y={b.y.toFixed(1)} width={b.w.toFixed(1)} height={b.h.toFixed(1)} rx={(b.h / 2).toFixed(1)} />
                  <circle r={c.big ? 1.3 : 0.9} />
                  <text x={b.tx.toFixed(1)} y={b.ty.toFixed(1)} fontSize={fs} textAnchor="middle">{c.name}</text>
                </g>
              );
            })}
            <g className="region__radius" transform={`translate(${(RADIUS_KM * 0.7).toFixed(1)} ${(-RADIUS_KM * 0.72).toFixed(1)})`}>
              <rect className="pill pill--accent" x="0" y="-4" width="25" height="8" rx="4" />
              <text x="3.3" y="1.6" fontSize="4.4">{RADIUS_KM} km</text>
            </g>
          </g>

          <g className="region__hq">
            <circle className="region__pulse" r="4" />
            <g className="region__pin">
              <path d="M0 0C-1.2-3.2-6-6-6-11a6 6 0 1 1 12 0c0 5-4.8 7.8-6 11z" />
              <circle cy="-11" r="2.4" />
            </g>
            <g className="region__hq-label" transform="translate(0 -21)">
              <rect className="pill pill--light" x="-30" y="-10" width="60" height="10.4" rx="5.2" />
              <text x="0" y="-5.4" fontSize="4.2" fontWeight="700" textAnchor="middle">L-mobile infrastructure</text>
              <text x="0" y="-1.6" fontSize="3.1" textAnchor="middle">Gartenstraße 51 · Sulzbach</text>
            </g>
          </g>
        </svg>
        <span className="region__credit">Satellitenbild: NASA/USGS Landsat · Relief: NASA ASTER</span>
      </div>
    </section>
  );
}
