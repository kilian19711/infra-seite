import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { byRoute, nav, navItems, listings, ADDRESS, PHONE, PHONE_HREF } from './data/site';
import Page from './pages/Page';
import About from './pages/About';
import Listing from './pages/Listing';
import HubSpotMeeting from './components/HubSpotMeeting';
import CookieBanner from './components/CookieBanner';
import { resetConsent } from './lib/consent';
import AnimatedLogo from './components/AnimatedLogo';
import SupportButton from './components/SupportButton';
import { VIEW_GERMANY, VIEW_REGION } from './components/RegionMap';
import { usePrefs, t } from './lib/prefs';
import Assistant from './components/Assistant';
import { QuickCheck, CostCalc } from './pages/Tools';
import PhishLab from './pages/PhishLab';
import BaramundiPage from './pages/BaramundiPage';
import BaramundiCalc from './pages/BaramundiCalc';
import ProfileStudioPage from './pages/ProfileStudioPage';
import { NewsList, NewsPost } from './pages/News';
import { lazy, Suspense } from 'react';
const Redaktion = lazy(() => import('./pages/Redaktion'));
import { newsBySlug } from './data/news';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Old WordPress URLs carried this prefix – strip it so existing links and Google results keep working.
const normalize = path => decodeURIComponent(path).replace(/^\/+|\/+$/g, '').replace(/^infrastructure-it-systemhaus-2\/?/, '');
const getRoute = () => normalize(location.pathname);

export function navigate(to) {
  if (to === location.pathname + location.search) return;
  history.pushState(null, '', to);
  dispatchEvent(new PopStateEvent('popstate'));
}

// Legacy #/route links (bookmarks from the preview) → real path.
if (location.hash.startsWith('#/')) history.replaceState(null, '', '/' + normalize(location.hash.slice(2)));
// Canonicalise old-prefixed paths in the address bar.
if (location.pathname !== '/' + getRoute() && location.pathname !== '/') history.replaceState(null, '', '/' + getRoute());

// Same-origin <a href="/..."> clicks become client-side navigations.
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="/"]');
  if (!a || a.target || a.hasAttribute('download') || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (/\.(pdf|png|jpe?g|svg|xml|txt)$/i.test(a.getAttribute('href'))) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
// Nav logo click: restart a one-off turn (class removed again when it ends so the next click can replay it).
function spinLogo(e) {
  const el = e.currentTarget;
  el.classList.remove('is-spin');
  void el.offsetWidth;
  el.classList.add('is-spin');
  el.addEventListener('animationend', () => el.classList.remove('is-spin'), { once: true });
}
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function useRoute() {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const on = () => setRoute(getRoute());
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, []);
  return route;
}

/** Brief logo reveal on first visit per session. */
function Intro() {
  const [show, setShow] = useState(() => {
    try { return !reduceMotion() && sessionStorage.getItem('intro') !== '1'; } catch { return false; }
  });
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem('intro', '1'); } catch { /* private mode */ }
    const id = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(id);
  }, [show]);
  if (!show) return null;
  return (
    <div className="intro" aria-hidden="true">
      <AnimatedLogo label="" />
      <span className="intro__line" />
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const open = now.getDay() % 6 !== 0 && now.getHours() >= 8 && now.getHours() < 17;
  return (
    <span className={`status ${open ? 'status--on' : ''}`}>
      {open ? 'Support online' : 'Support ab 08:00'} · {now.toLocaleTimeString('de-DE')}
    </span>
  );
}


function Nav({ route }) {
  const [open, setOpen] = useState(false);
  const { lang } = usePrefs();
  useEffect(() => setOpen(false), [route]);
  return (
    <header className={`nav${open ? ' nav--open' : ''}`}>
      <a href="/" className="nav__logo" aria-label="L-mobile infrastructure – Startseite" onClick={spinLogo}><AnimatedLogo label="" /></a>
      <button className="nav__burger" aria-expanded={open} aria-label="Menü" onClick={() => setOpen(o => !o)}><span /><span /></button>
      <nav className="nav__links" aria-label="Hauptnavigation">
        {nav.map(n =>
          n.route ? (
            <a key={n.label} href={`/${n.route}`} aria-current={route === n.route ? 'page' : undefined}>{t(n.label, lang)}</a>
          ) : (
            <div className="nav__group" key={n.label}>
              <button className="nav__trigger" aria-haspopup="true">{t(n.label, lang)}</button>
              {n.columns ? (
                <div className="nav__menu nav__menu--mega">
                  {n.columns.map(c => (
                    <div className="mega__col" key={c.title}>
                      <a className="mega__head" href={`/${c.route}`} aria-current={route === c.route ? 'page' : undefined}>{t(c.title, lang)}</a>
                      <p>{t(c.text, lang)}</p>
                      {c.items.filter(([, r]) => r !== c.route).map(([label, r]) => (
                        <a key={r} href={`/${r}`} aria-current={route === r ? 'page' : undefined}>{t(label, lang)}</a>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="nav__menu">
                  {n.items.map(([label, r]) => (
                    <a key={r} href={`/${r}`} aria-current={route === r ? 'page' : undefined}>{t(label, lang)}</a>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        <SupportButton />
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <a href="/" className="nav__logo" aria-label="L-mobile infrastructure – Startseite" onClick={spinLogo}><AnimatedLogo label="" /></a>
          <p>Ihr IT-Systemhaus in Sulzbach an der Murr bei Stuttgart. Teil der Löchner Group AG.</p>
          <Clock />
        </div>
        <div>
          <h4>Kontakt</h4>
          <a href={PHONE_HREF}>{PHONE}</a>
          <p>Mo–Fr, 08:00–17:00 Uhr<br />{ADDRESS.street}<br />{ADDRESS.city}</p>
          <a href="/kontakt">Anfrage senden</a>
          <a href="https://l-mobile.com/das-unternehmen/karriere/" target="_blank" rel="noreferrer">Jobs &amp; Karriere</a>
        </div>
        {nav.filter(n => !n.route).map(n => (
          <div key={n.label}>
            <h4>{n.label}</h4>
            {navItems(n).map(([l, r]) => <a key={r} href={`/${r}`}>{l}</a>)}
          </div>
        ))}
      </div>
      <div className="footer__legal">
        <span>© {new Date().getFullYear()} L-mobile infrastructure</span>
        <nav aria-label="Rechtliches"><a href="/impressum">Impressum</a><a href="/datenschutzinformation">Datenschutz</a><button type="button" className="footer__cookie" onClick={resetConsent}>Cookie-Einstellungen</button></nav>
      </div>
    </footer>
  );
}

function View({ route }) {
  if (route === 'ueber-uns') return <About />;
  if (route === 'termin') return <HubSpotMeeting standalone />;
  if (route === 'softwareloesungen/desktop-management-software') return <BaramundiPage />;
  // Not linked in the navigation – reached via the baramundi page.
  if (route === 'baramundi-rechner') return <BaramundiCalc />;
  if (route === 'softwareloesungen/profilestudio') return <ProfileStudioPage />;
  if (route === 'redaktion') return <Suspense fallback={<p className="section">Lade Redaktion …</p>}><Redaktion /></Suspense>;
  if (route === 'aktuelles') return <NewsList />;
  if (route.startsWith('aktuelles/')) return <NewsPost slug={route.slice(10)} />;
  if (route === 'schnell-check') return <QuickCheck />;
  if (route === 'ausfallkosten') return <CostCalc />;
  if (route === 'phishing-training') return <PhishLab />;
  if (route in listings) return <Listing route={route} />;
  const page = byRoute[route];
  if (!page) return <section className="section page-hero"><h1>404 – Seite nicht gefunden</h1><a className="btn" href="/">Zur Startseite</a></section>;
  return <Page page={page} />;
}

export default function App() {
  const route = useRoute();
  const main = useRef(null);
  const lenis = useRef(null);
  const navigated = useRef(false);

  // Lenis drives the scroll; ScrollTrigger reads from it on every frame.
  useEffect(() => {
    if (reduceMotion()) return;
    const l = (lenis.current = new Lenis());
    l.on('scroll', ScrollTrigger.update);
    const raf = t => l.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); l.destroy(); };
  }, []);

  useEffect(() => {
    const p = byRoute[route];
    const name = { 'ueber-uns': 'Über uns', termin: 'Termin buchen', 'schnell-check': 'OZELOT-Test IT-Sicherheit', ausfallkosten: 'Ausfallkosten-Rechner', 'phishing-training': 'Phishing-Training', 'baramundi-rechner': 'baramundi-Ersparnisrechner', 'softwareloesungen/profilestudio': 'ProfileStudio – Apple-Profile einfach erstellen', aktuelles: 'Aktuelles – IT-Sicherheit aktuell' }[route] || newsBySlug[route.slice(10)]?.title || p?.title;
    document.title = name ? `${name} | L-mobile infrastructure` : 'L-mobile infrastructure';
    // Per-route meta for sharing/SEO (crawlers that run JS); static defaults live in index.html.
    const desc = p?.description || newsBySlug[route.slice(10)]?.summary || document.querySelector('main p')?.textContent || '';
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc.slice(0, 160));
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://infrastructure-systemhaus.de/${route}${route ? '/' : ''}`);
    // Move focus to the new page's heading so screen readers announce the navigation.
    if (navigated.current) document.getElementById('main')?.focus({ preventScroll: true });
    navigated.current = true;
    lenis.current ? lenis.current.scrollTo(0, { immediate: true }) : scrollTo(0, 0);
  }, [route]);

  // Re-created per route: every page shares the same animation vocabulary via class names.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
        gsap.from('.page-hero__text > *', { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.1 });
        gsap.from('.scene3d', { opacity: 0, duration: 2, ease: 'power2.out' });
        // Idee 10: cinematic flight Germany → Sulzbach. Plays every time the map scrolls into view (also after
        // scrolling up and back down); resets when the section is left upwards.
        gsap.utils.toArray('.region__svg').forEach(svg => {
          const q = sel => svg.querySelectorAll(sel);
          const [x0, y0, s0] = VIEW_GERMANY.split(' ').map(Number), [x1, y1, s1] = VIEW_REGION.split(' ').map(Number);
          const c0 = [x0 + s0 / 2, y0 + s0 / 2], c1 = [x1 + s1 / 2, y1 + s1 / 2];
          // Camera zoom: size changes geometrically (constant perceived speed), centre follows the size so the
          // target never drifts sideways – avoids the "sliding" look of a linear viewBox tween.
          const cam = { t: 0 };
          const setView = () => {
            const size = s0 * Math.pow(s1 / s0, cam.t);
            const k = (size - s1) / (s0 - s1);
            const cx = c1[0] + (c0[0] - c1[0]) * k, cy = c1[1] + (c0[1] - c1[1]) * k;
            svg.setAttribute('viewBox', `${(cx - size / 2).toFixed(2)} ${(cy - size / 2).toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`);
          };
          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: 'power1.out' },
            // refreshPriority -1: measure after other pinned sections have added their spacers.
            scrollTrigger: { trigger: svg.closest('.region__map'), start: 'top 75%', end: 'bottom 15%', toggleActions: 'restart none restart reset', refreshPriority: -1 },
          });
          tl.set(cam, { t: 0, onComplete: setView })
            .set(q('.region__near > g, .region__hq-label'), { opacity: 0 })
            .set(q('.region__far'), { opacity: 1 })
            .set(q('.region__detail'), { opacity: 0 })
            .set(q('.region__area'), { attr: { r: 0 }, opacity: 0 })
            .set(q('.region__pin'), { opacity: 0 })
            .from(q('.region__far > g'), { opacity: 0, duration: 0.6, stagger: 0.1 }, 0)
            .to(cam, { t: 1, duration: 3.4, ease: 'sine.inOut', onUpdate: setView }, 0.6)
            .to(q('.region__far'), { opacity: 0, duration: 1 }, 1.4)
            .to(q('.region__detail'), { opacity: 1, duration: 1.6, ease: 'sine.inOut' }, 1.8)
            .to(q('.region__area'), { attr: { r: 100 }, opacity: 1, duration: 1.4, ease: 'sine.out' }, 3.3)
            .to(q('.region__pin'), { opacity: 1, duration: 0.6 }, 3.6)
            .to(q('.region__near > g'), { opacity: 1, duration: 0.6, stagger: 0.04 }, 3.8)
            .to(q('.region__hq-label'), { opacity: 1, duration: 0.6 }, 4.3);
        });
        // CTA band: the two halves of the logo mark slide together while scrolling past.
        gsap.utils.toArray('.alogo--scrub').forEach(svg => {
          const st = { trigger: svg.closest('section') || svg, start: 'top bottom', end: 'center center', scrub: 1 };
          gsap.fromTo(svg.querySelector('.alogo__a'), { x: -260, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: st });
          gsap.fromTo(svg.querySelector('.alogo__b'), { x: 260, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: st });
        });
        gsap.from('.page-hero__img', { clipPath: 'inset(0 0 0 100%)', duration: 1.4, ease: 'power3.inOut', delay: 0.2 });
        gsap.to('.page-hero .scene3d', { yPercent: 25, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.page-hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.utils.toArray('.reveal').forEach(el =>
          gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } })
        );
        gsap.utils.toArray('.stagger').forEach(group =>
          gsap.from(group.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: group, start: 'top 85%' } })
        );
        gsap.utils.toArray('.img-reveal').forEach(el =>
          gsap.from(el, { clipPath: 'inset(0 100% 0 0)', duration: 1.3, ease: 'power4.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } })
        );
        gsap.utils.toArray('.parallax img').forEach(img =>
          gsap.fromTo(img, { yPercent: -8, scale: 1.1 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true } })
        );
        gsap.utils.toArray('[data-count]').forEach(el => {
          const o = { n: 0 };
          gsap.to(o, { n: +el.dataset.count, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' },
            onUpdate: () => (el.textContent = Math.round(o.n) + (el.dataset.suffix || '')) });
        });
        gsap.utils.toArray('.timeline').forEach(t =>
          gsap.from(t.querySelector('.timeline__progress'), { scaleY: 0, ease: 'none', scrollTrigger: { trigger: t, start: 'top 70%', end: 'bottom 60%', scrub: true } })
        );
      });
      ScrollTrigger.refresh();
    },
    { scope: main, dependencies: [route], revertOnUpdate: true }
  );

  return (
    <>
      <Intro />
      <div className="progress" aria-hidden="true" />
      <a className="skip" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Zum Inhalt springen</a>
      <Nav route={route} />
      <main ref={main} key={route} id="main" tabIndex={-1}>
        <View route={route} />
      </main>
      <Footer />
      <Assistant />
      <CookieBanner />
    </>
  );
}
