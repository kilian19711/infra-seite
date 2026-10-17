import { useSyncExternalStore } from 'react';

/*
 * Viewer preferences: language (de/en, remembered in localStorage) and colour theme (light/dark, per visit only).
 * ponytail: EN only translates the site chrome (nav, menus, support panel) via EN below – page content is still
 * German until a real translation exists.
 */
const KEY = 'lmi-prefs';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let state = {
  lang: read().lang || 'de',
  // Always start light – dark mode only lives for the current visit (kept across sub-pages, reset on reload).
  theme: 'light',
};
const listeners = new Set();
const apply = () => {
  document.documentElement.lang = state.lang;
  document.documentElement.dataset.theme = state.theme;
};
apply();

export function setPref(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify({ lang: state.lang })); } catch { /* private mode */ }
  apply();
  listeners.forEach(l => l());
}
export const usePrefs = () => useSyncExternalStore(cb => (listeners.add(cb), () => listeners.delete(cb)), () => state);

const EN = {
  'IT-Systemhaus': 'IT Services', 'Leistungen': 'Services', 'Interaktiv': 'Interactive', 'Aktuelles': 'News', 'Kontakt': 'Contact',
  'Über uns': 'About us', 'Karriere': 'Careers', 'Empfehlungsprogramm': 'Referral programme', 'Referenzen': 'References',
  'IT-Sicherheit': 'IT security', 'IT-Infrastruktur': 'IT infrastructure', 'Softwarelösungen': 'Software solutions', 'Schulen & Gemeinden': 'Schools & municipalities',
  'IT-Sicherheit & OZELOT-Check': 'IT security & OZELOT check', 'Managed Services': 'Managed services', 'Netzwerklösungen': 'Network solutions',
  'Serverlösungen': 'Server solutions', 'WLAN-Lösungen': 'Wi-Fi solutions', 'VoIP-Telefonie': 'VoIP telephony', 'Montage Service': 'Installation service',
  'Desktop Management (baramundi)': 'Desktop management (baramundi)', 'Dokumentenmanagement (ELO)': 'Document management (ELO)',
  'Microsoft 365 & Azure': 'Microsoft 365 & Azure', 'Digitalisierung von Schulen': 'School digitalisation', 'LogoDIDACT-Alternative': 'LogoDIDACT alternative',
  'OZELOT-Test IT-Sicherheit': 'OZELOT security test', 'Ausfallkosten-Rechner': 'Downtime cost calculator', 'Phishing-Training': 'Phishing training',
  'IT-Insights (Blog)': 'IT insights (blog)', 'Whitepaper': 'White papers', 'Demo anfordern': 'Request a demo',
  'Schutz vor Cyberangriffen – in 18 Tagen IT-sicher.': 'Protection against cyber attacks – secure in 18 days.',
  'Netzwerk, Server und Betrieb aus einer Hand.': 'Network, servers and operations from one source.',
  'Endgeräte, Dokumente und Cloud im Griff.': 'Devices, documents and cloud under control.',
  'Digitalpakt 2.0, Schulnetz und Förderung.': 'Digital pact 2.0, school networks and funding.',
  'erreichbar': 'available', 'geschlossen': 'closed', 'Support-Hotline': 'Support hotline', 'Jetzt besetzt': 'Staffed now',
  'Nicht besetzt': 'Not staffed', 'Jetzt anrufen': 'Call now', 'Ticket Erstellen': 'Create ticket',
  'Direkter Kontakt nach Anliegen': 'Direct contact by topic', 'Anrufen': 'Call', 'E-Mail schreiben': 'Send email', 'Telefon': 'Phone',
};
/** Translate a UI string when EN is active; unknown strings fall back to German. */
export const t = (s, lang = state.lang) => (lang === 'en' && EN[s]) || s;
