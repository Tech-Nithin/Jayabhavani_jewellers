import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils';

interface ProductCardProps {
  product: Product;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="product-card reveal" id={`card-${product.id}`}>
      <div className="product-img-wrap">
        {/* Placeholder background (shown when image fails) */}
        <div
          style={{
            width: '100%', height: '100%',
            background: product.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'absolute', inset: 0,
          }}
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '3rem', opacity: 0.35 }}>✦</span>
        </div>

        <img
          src={product.img}
          alt={product.name}
          className="product-img"
          style={{ position: 'relative', zIndex: 1 }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.failed) {
              img.dataset.failed = 'true';
              img.src = '/Pearl_Gold_Choker.jpeg';
            }
          }}
        />

        {product.badge && (
          <span className={`product-badge badge-${product.badge}`}>{product.badge}</span>
        )}

        <div className="product-actions">
          <button
            className={`product-action-btn${isWishlisted ? ' wishlisted' : ''}`}
            id={`wish-${product.id}`}
            aria-label="Add to wishlist"
            onClick={() => toggleWishlist(product.id)}
          >
            <HeartIcon filled={isWishlisted} />
          </button>
          <button
            className="product-action-btn"
            aria-label="Quick view"
            onClick={() => alert(`Quick view: ${product.name}`)}
          >
            <EyeIcon />
          </button>
        </div>
      </div>

      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-price-row">
          <div>
            <span className="product-price">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="product-price-old">{formatPrice(product.oldPrice)}</span>
            )}
          </div>
          <button
            className="product-cart-btn"
            aria-label="Add to cart"
            onClick={() => addToCart(product.id)}
          >
            <CartIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
