import type { Product } from '../types';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  id: string;
  tag: string;
  title: string;
  desc: string;
  products: Product[];
  alt?: boolean;
  viewAllLabel?: string;
  onViewAll?: (id: string) => void;
}

export default function ProductSection({
  id, tag, title, desc, products, alt = false, viewAllLabel = 'View All', onViewAll,
}: ProductSectionProps) {
  return (
    <section className={`section products-section${alt ? ' products-alt' : ''}`} id={id}>
      <div className="container">
        <div className="section-header">
          <span className="section-tag">{tag}</span>
          <h2 className="section-title">{title}</h2>
          <p className="section-desc">{desc}</p>
        </div>
        <div className="products-grid" id={`${id}-grid`}>
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="section-footer">
          <a
            href="#"
            className="btn btn-outline"
            onClick={(e) => {
              if (onViewAll) {
                e.preventDefault();
                onViewAll(id);
              }
            }}
          >
            {viewAllLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
