import { contactFor, telHref, meetingHref } from '../data/site';

/** "Ihr Ansprechpartner" card for topic pages – picks the person responsible for the route's topic. */
export default function ContactBox({ route }) {
  const p = contactFor(route);
  if (!p) return null;
  return (
    <aside className="cbox" aria-label="Ihr Ansprechpartner">
      <img src={p.img} alt="" loading="lazy" />
      <div className="cbox__who">
        <small>Ihr Ansprechpartner</small>
        <strong>{p.name}</strong>
        <span>{p.topic}</span>
      </div>
      <div className="cbox__actions">
        <a className="btn btn--small" href={telHref(p.phone)}>Anrufen</a>
        <a className="btn btn--small btn--ghost" href={`mailto:${p.email}`}>E-Mail</a>
        <a className="btn btn--small btn--ghost" href={meetingHref(p.name)}>Termin</a>
      </div>
    </aside>
  );
}
