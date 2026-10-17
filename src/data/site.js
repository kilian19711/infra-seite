import pages from './pages.json';

export { pages };
export const byRoute = Object.fromEntries(pages.map(p => [p.route, p]));

export const PHONE = '+49 7193 93 12-1020';
export const SUPPORT_EMAIL = 'service@infrastructure-systemhaus.de';
export const PHONE_HREF = 'tel:+49719393121020';

export const ADDRESS = { street: 'Gartenstraße 51', city: '71560 Sulzbach an der Murr', lat: 49.003, lon: 9.502 };

// ---- Settings to fill in before go-live (see PDF "Nächste Schritte") ----
// ponytail: null = fallback to the Kontakt page / demo booking until the real URLs exist.
export const TICKET_URL = 'https://infrastructure-systemhaus.de/service';
export const HUBSPOT_MEETING_URL = 'https://meetings-eu1.hubspot.com/luca-layher/baramundi?embed=true';
export const SUPPORT_HOURS = { days: [1, 2, 3, 4, 5], from: 8, to: 17 }; // Mo–Fr 08–17 Uhr

export const isSupportOpen = (d = new Date()) =>
  SUPPORT_HOURS.days.includes(d.getDay()) && d.getHours() >= SUPPORT_HOURS.from && d.getHours() < SUPPORT_HOURS.to;


export const team = [
  { name: 'Daniel Diemer', role: 'Geschäftsführer', img: '/img/2025-05-daniel-diemer-gf-infrastructure.jpg', text: 'Seit 2015 an der Spitze von L-mobile infrastructure.' },
  { name: 'Marian Thede', role: 'Hardwareberatung', img: '/img/2025-05-marian-thede-sales-manager.jpg', text: 'Vom Drucker bis zur Serverlösung – und Ansprechpartner für Bestandskunden.', topic: 'Hardware & Bestandskunden' },
  { name: 'Luca Layher', role: 'Desktop Management', img: '/img/2025-05-luca-layher-sales-manager.jpg', text: 'Experte für die baramundi Management Suite.', topic: 'baramundi & Desktop Management' },
  { name: 'Torsten Ebert', role: 'Bildung & Cybersecurity', img: '/img/2026-06-ansprechpartner-torsten-ebert.jpg', text: 'Digitalpakt 2.0, Förderungen, über 15 Jahre Vertriebserfahrung.', topic: 'Schulen, Förderung & Cybersecurity' },
];

// Direct lines of the contact persons (support panel + "Ihr Ansprechpartner" box on topic pages).
export const DIRECT = {
  'Marian Thede': { email: 'marian.thede@l-mobile.com', phone: '+49 7193 93 12-225', meeting: 'https://meetings-eu1.hubspot.com/marian-thede?embed=true' },
  'Luca Layher': { email: 'luca.layher@l-mobile.com', phone: '+49 7193 93 12-1080', meeting: 'https://meetings-eu1.hubspot.com/luca-layher/baramundi?embed=true' },
  'Torsten Ebert': { email: 'torsten.ebert@l-mobile.com', phone: '+49 7193 93 12-1026', meeting: 'https://meetings-eu1.hubspot.com/torsten-ebert?embed=true' },
};
// People with their own HubSpot calendar; /termin?mit=<vorname> preselects one.
export const CALENDARS = Object.entries(DIRECT).map(([name, d]) => ({ name, key: name.split(' ')[0].toLowerCase(), url: d.meeting }));
export const meetingHref = name => DIRECT[name]?.meeting ? `/termin?mit=${name.split(' ')[0].toLowerCase()}` : '/termin';
export const telHref = p => `tel:${p.replace(/[^\d+]/g, '')}`;
console.assert(telHref('+49 7193 93 12-225') === 'tel:+4971939312225', 'tel href');

// Which contact person owns which topic (route prefixes, first match wins).
export const TOPIC_CONTACT = [
  [/^(softwareloesungen|software-demo|baramundi-rechner|whitepaper\/(baramundi|windows|schnell))/, 'Luca Layher'],
  [/^(it-sicherheit|schnell-check|phishing-training|digitalisierung-von-schulen|logodidact|whitepaper\/schwachstellen)/, 'Torsten Ebert'],
  [/^(it-infrastruktur|ausfallkosten|whitepaper\/in-4-schritten)/, 'Marian Thede'],
];
export const contactFor = route => {
  const hit = TOPIC_CONTACT.find(([re]) => re.test(route));
  const person = hit && team.find(t => t.name === hit[1]);
  return person ? { ...person, ...DIRECT[person.name] } : null;
};

export const nav = [
  { label: 'IT-Systemhaus', items: [['Über uns', 'ueber-uns'], ['Karriere', 'ueber-uns/karriere'], ['Empfehlungsprogramm', 'empfehlungsprogramm'], ['Referenzen', 'referenzen']] },
  { label: 'Leistungen', columns: [
    { title: 'IT-Sicherheit', route: 'it-sicherheit', text: 'Schutz vor Cyberangriffen – in 18 Tagen IT-sicher.', items: [
      ['IT-Sicherheit & OZELOT-Check', 'it-sicherheit'],
    ] },
    { title: 'IT-Infrastruktur', route: 'it-infrastruktur', text: 'Netzwerk, Server und Betrieb aus einer Hand.', items: [
      ['Managed Services', 'it-infrastruktur/managed-services'],
      ['Netzwerklösungen', 'it-infrastruktur/netzwerkloesungen'],
      ['Serverlösungen', 'it-infrastruktur/serverloesungen'],
      ['WLAN-Lösungen', 'it-infrastruktur/wlan-loesungen'],
      ['VoIP-Telefonie', 'it-infrastruktur/voip-telefonie'],
      ['Montage Service', 'it-infrastruktur/montage-service'],
    ] },
    { title: 'Softwarelösungen', route: 'softwareloesungen', text: 'Endgeräte, Dokumente und Cloud im Griff.', items: [
      ['Desktop Management (baramundi)', 'softwareloesungen/desktop-management-software'],
      ['Dokumentenmanagement (ELO)', 'softwareloesungen/dokumenten-management-systeme'],
      ['Microsoft 365 & Azure', 'softwareloesungen/microsoft-365-azure'],
      ['ProfileStudio (eigene Software)', 'softwareloesungen/profilestudio'],
    ] },
    { title: 'Schulen & Gemeinden', route: 'digitalisierung-von-schulen', text: 'Digitalpakt 2.0, Schulnetz und Förderung.', items: [
      ['Digitalisierung von Schulen', 'digitalisierung-von-schulen'],
      ['LogoDIDACT-Alternative', 'logodidact-alternative-schulnetzverwalter-und-timago-imageverwaltung'],
    ] },
  ] },
  { label: 'Interaktiv', items: [
    ['OZELOT-Test IT-Sicherheit', 'schnell-check'],
    ['Ausfallkosten-Rechner', 'ausfallkosten'],
    ['Phishing-Training', 'phishing-training'],
    ['IT-Insights (Blog)', 'interaktiv/it-insights'],
    ['Whitepaper', 'interaktiv/whitepaper'],
    ['Demo anfordern', 'interaktiv/demo-anfordern'],
  ] },
  { label: 'Aktuelles', route: 'aktuelles' },
  { label: 'Kontakt', route: 'kontakt' },
];

// Overview pages whose original content is a dynamic WordPress list – rebuilt from the crawled sub-pages.
export const listings = {
  'interaktiv/whitepaper': 'whitepaper/',
  'interaktiv/demo-anfordern': 'software-demo/',
  'interaktiv/it-insights': 'blog/',
  'interaktiv': '',
  referenzen: 'referenz/',
};
export const listingPrefixes = ['whitepaper/', 'software-demo/', 'blog/'];

// Flat list per nav group (mega-menu columns flattened) – used by footer, breadcrumbs and "related" links.
export const navItems = n => n.items || n.columns.flatMap(c => [[c.title, c.route], ...c.items.filter(([, r]) => r !== c.route)]);

/** Breadcrumb trail + sibling pages for a route, derived from the nav tree. */
export function locate(route) {
  for (const n of nav) {
    for (const c of n.columns || []) {
      if (c.route === route || c.items.some(([, r]) => r === route)) {
        const trail = [[n.label, null], ...(c.route !== route ? [[c.title, c.route]] : [])];
        const siblings = [[c.title, c.route], ...c.items].filter(([, r], i, a) => r !== route && a.findIndex(x => x[1] === r) === i);
        return { trail, siblings, area: c.title };
      }
    }
    if (n.items?.some(([, r]) => r === route)) return { trail: [[n.label, null]], siblings: n.items.filter(([, r]) => r !== route), area: n.label };
  }
  if (route.startsWith('aktuelles/')) return { trail: [['Aktuelles', 'aktuelles']], siblings: [], area: 'Aktuelles' };
  if (route.startsWith('referenz/')) return { trail: [['IT-Systemhaus', null], ['Referenzen', 'referenzen']], siblings: [], area: 'Referenzen' };
  for (const [prefix, label, r] of [['whitepaper/', 'Whitepaper', 'interaktiv/whitepaper'], ['software-demo/', 'Demo anfordern', 'interaktiv/demo-anfordern'], ['blog/', 'IT-Insights', 'interaktiv/it-insights']])
    if (route.startsWith(prefix)) return { trail: [['Interaktiv', null], [label, r]], siblings: [], area: label };
  return { trail: [], siblings: [], area: null };
}
