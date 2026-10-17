import { useEffect, useRef, useState } from 'react';
import { usePrefs, t } from '../lib/prefs';
import { isSupportOpen, PHONE, PHONE_HREF, TICKET_URL, SUPPORT_HOURS, team, DIRECT, telHref } from '../data/site';

const pad = n => String(n).padStart(2, '0');
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
// Direct lines are only shown in the support panel (on purpose not in the general team data).
const contacts = team.filter(t => DIRECT[t.name]).map(t => ({ ...t, ...DIRECT[t.name] }));

/** Minutes until closing (open) or the next opening as Date (closed). */
export function supportStatus(now = new Date()) {
  if (isSupportOpen(now)) {
    const close = new Date(now); close.setHours(SUPPORT_HOURS.to, 0, 0, 0);
    return { open: true, minutesLeft: Math.round((close - now) / 60000) };
  }
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (now.getHours() >= SUPPORT_HOURS.from) next.setDate(next.getDate() + 1);
  next.setHours(SUPPORT_HOURS.from);
  while (!SUPPORT_HOURS.days.includes(next.getDay())) next.setDate(next.getDate() + 1);
  return { open: false, next };
}
// Self-checks: Friday 18:00 → Monday 08:00; Monday 16:30 → 30 min left; Tuesday 06:00 → same day 08:00.
console.assert(supportStatus(new Date(2026, 9, 16, 18)).next?.getDay() === 1, 'support: weekend skip');
console.assert(supportStatus(new Date(2026, 9, 12, 16, 30)).minutesLeft === 30, 'support: minutes left');
console.assert(supportStatus(new Date(2026, 9, 13, 6)).next?.getDate() === 13, 'support: same day');

const fmtLeft = m => (m >= 60 ? `noch ${Math.floor(m / 60)} Std.${m % 60 ? ` ${m % 60} Min.` : ''}` : `noch ${m} Min.`);
const fmtNext = (d, now = new Date()) => {
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const day = d.toDateString() === now.toDateString() ? 'heute' : d.toDateString() === tomorrow.toDateString() ? 'morgen' : `${DAYS[d.getDay()]}.`;
  return `${day} ab ${pad(d.getHours())}:00 Uhr`;
};


/** Idee 2: support panel in the header – hotline, ticket system, direct contact persons by topic. */
export default function SupportButton() {
  usePrefs(); // re-render on language switch
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const ref = useRef(null);
  const timer = useRef(null);
  const st = supportStatus(now);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    return () => { clearInterval(id); document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, []);

  // Hover intent: small delays so the panel doesn't flicker when the pointer just passes by.
  const hover = on => {
    if (!matchMedia('(hover: hover)').matches) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(on), on ? 120 : 250);
  };

  return (
    <div className="support" ref={ref} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
      <button className={`support__btn${st.open ? ' is-live' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(o => !o)}>
        <span className="support__dot" aria-hidden="true" />
        <span className="support__label">Support</span>
        <span className="support__state">{st.open ? 'Erreichbar' : 'Geschlossen'}</span>
      </button>
      {open && (
        <div className="support__panel" role="dialog" aria-label="Support">
          {/* 1. Hotline */}
          <section className={`support__block support__status${st.open ? ' is-live' : ''}`}>
            <div className="support__head">
              <span className="support__dot" aria-hidden="true" />
              <div>
                <strong>{t('Support-Hotline')}</strong>
                <span><b className={st.open ? 'is-on' : 'is-off'}>{t(st.open ? 'Jetzt besetzt' : 'Nicht besetzt')}</b> · {st.open ? fmtLeft(st.minutesLeft) : `wieder ${fmtNext(st.next, now)}`}</span>
              </div>
            </div>
            {st.open ? (
              <a className="support__action support__action--primary" href={PHONE_HREF}>
                <span><strong>{PHONE}</strong><small>{t('Jetzt anrufen')}</small></span>
              </a>
            ) : (
              <div className="support__action support__action--off" aria-disabled="true">
                <span><strong>{PHONE}</strong><small>Erreichbar Mo–Fr {pad(SUPPORT_HOURS.from)}:00–{SUPPORT_HOURS.to}:00 Uhr</small></span>
              </div>
            )}
          </section>

          {/* 2. Ticket system */}
          <section className="support__block">
            <a className="support__action support__action--primary" href={TICKET_URL} target="_blank" rel="noopener noreferrer">
              <span><strong>{t('Ticket Erstellen')}</strong></span>
            </a>
          </section>

          {/* 3. Direct contact by topic */}
          <section className="support__block support__people">
            <p className="support__title">{t('Direkter Kontakt nach Anliegen')}</p>
            {contacts.map(p => {
              const isOpen = person === p.name;
              const id = `support-${p.name.replace(/\s/g, '-')}`;
              return (
                <div key={p.name} className={`support__person${isOpen ? ' is-open' : ''}`}>
                  <button className="support__person-head" aria-expanded={isOpen} aria-controls={id} onClick={() => setPerson(isOpen ? null : p.name)}>
                    <img src={p.img} alt="" loading="lazy" />
                    <span><strong>{p.topic}</strong><small>{p.name}</small></span>
                    <i className="support__chev" aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className="support__person-body" id={id}>
                      <dl>
                        <div><dt>Telefon</dt><dd>{p.phone}</dd></div>
                        <div><dt>E-Mail</dt><dd>{p.email}</dd></div>
                      </dl>
                      <div className="support__person-actions">
                        <a className="btn btn--small" href={telHref(p.phone)}>{t('Anrufen')}</a>
                        <a className="btn btn--small btn--ghost" href={`mailto:${p.email}`}>{t('E-Mail schreiben')}</a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}
