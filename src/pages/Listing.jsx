import SpotlightCard from '../components/SpotlightCard';
import Scene3D from '../components/Scene3D';
import { Breadcrumbs } from '../components/Wayfinding';
import { byRoute, listings, listingPrefixes, pages } from '../data/site';

const LABELS = { 'whitepaper/': 'Whitepaper', 'software-demo/': 'Software-Demos', 'blog/': 'IT-Insights', 'referenz/': 'Referenzen' };

export default function Listing({ route }) {
  const prefix = listings[route];
  const groups = prefix ? [prefix] : listingPrefixes;
  const title = byRoute[route]?.title || LABELS[prefix];
  return (
    <>
      <section className="page-hero page-hero--short">
        <Scene3D variant="lattice" />
        <div className="hud" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="page-hero__text">
          <Breadcrumbs route={route} title={title} />
          <p className="eyebrow">Interaktiv</p>
          <h1 className="page-hero__title">{title}</h1>
          {byRoute[route]?.description && <p className="page-hero__lead">{byRoute[route].description}</p>}
        </div>
      </section>
      {groups.map(g => (
        <section className="section" key={g}>
          {groups.length > 1 && <h2 className="reveal">{LABELS[g]}</h2>}
          <div className="grid grid--cards stagger">
            {pages.filter(p => p.route.startsWith(g)).map(p => {
              const img = p.blocks.find(b => b.t === 'img');
              const h1 = p.blocks.find(b => b.t === 'h1')?.text || p.title;
              const teaser = p.description || p.blocks.find(b => b.t === 'p' && b.text.length > 60)?.text;
              return (
                <SpotlightCard key={p.route} className="card card--link" spotlightColor="#009acd">
                  <a href={`/${p.route}`}>
                    {img && <img className="card__thumb" src={img.src} alt="" loading="lazy" />}
                    <h3>{h1}</h3>
                    {teaser && <p>{teaser.slice(0, 160)}{teaser.length > 160 ? '…' : ''}</p>}
                    <span className="card__link">Mehr erfahren</span>
                  </a>
                </SpotlightCard>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
