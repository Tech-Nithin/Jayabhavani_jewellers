import type { Collection } from '../types';
import { collections } from '../data/products';

function CollectionCard({ col }: { col: Collection }) {
  return (
    <div
      className={`collection-card reveal${col.large ? ' large' : ''}`}
      id={col.id}
      tabIndex={0}
    >
      <div className="collection-img-wrap">
        <img
          src={col.img}
          alt={`${col.name} Collection`}
          className="collection-img"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
            const ph = document.createElement('div');
            ph.style.cssText = `width:100%;height:100%;background:${col.color};display:flex;align-items:center;justify-content:center;`;
            ph.innerHTML = `<span style="font-family:'Cormorant Garamond',serif;font-size:4rem;opacity:.25;color:#fff;">✦</span>`;
            el.parentElement?.appendChild(ph);
          }}
        />
        <div className="collection-overlay" />
      </div>
      <div className="collection-info">
        <span className="collection-tag">{col.tag}</span>
        <h3 className="collection-name">{col.name}</h3>
        <p className="collection-count">{col.count}</p>
        <a href={col.href} className="collection-cta">Explore →</a>
      </div>
    </div>
  );
}

export default function CollectionsGrid() {
  return (
    <section className="section collections-section" id="collections">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Curated For You</span>
          <h2 className="section-title">Shop By Collection</h2>
          <p className="section-desc">Each piece tells a story of elegance and timeless beauty</p>
        </div>
        <div className="collections-grid">
          {collections.map((col: Collection) => (
            <CollectionCard key={col.id} col={col} />
          ))}
        </div>
      </div>
    </section>
  );
}
