import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config/apiConfig';

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [todayRates, setTodayRates] = useState({
    gold_sell_value: 14700,
    silver_sell_value: 270,
  });

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(`${API_BASE}/product-card/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setTodayRates({
            gold_sell_value: Number(data.rates.gold_sell_value) || 14700,
            silver_sell_value: Number(data.rates.silver_sell_value) || 270,
          });
        }
      } catch (err) {
        // Fallback
      }
    }
    fetchRates();
  }, []);

  const isSilver = product.category?.toLowerCase().includes('silver') ||
                   product.name?.toLowerCase().includes('silver') ||
                   product.category?.toLowerCase().includes('999') ||
                   product.category?.toLowerCase().includes('925');

  const rate = isSilver ? todayRates.silver_sell_value : todayRates.gold_sell_value;

  const weightFrom = product.weightFrom !== undefined && product.weightFrom !== null 
    ? product.weightFrom 
    : (product.price ? Number((product.price / 12000).toFixed(1)) : 8);

  const weightTo = product.weightTo !== undefined && product.weightTo !== null 
    ? product.weightTo 
    : (product.price ? Number((product.price / 8000).toFixed(1)) : 12);

  const calculatedPriceMin = weightFrom * rate;
  const calculatedPriceMax = weightTo * rate;

  return (
    <>
      <div 
        className="product-card reveal" 
        id={`card-${product.id}`}
        onClick={() => setIsDetailOpen(true)}
        style={{ cursor: 'pointer' }}
      >
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
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
            >
              <HeartIcon filled={isWishlisted} />
            </button>
            <button
              className="product-action-btn"
              aria-label="Quick view"
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailOpen(true);
              }}
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
              <span className="product-price" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309' }}>
                {product.weightFrom !== undefined && product.weightFrom !== null
                  ? (product.weightTo && Number(product.weightTo) !== Number(product.weightFrom)
                      ? `${product.weightFrom}g - ${product.weightTo}g`
                      : `${product.weightFrom}g`)
                  : (product.price ? `${(product.price / 15000).toFixed(1)}g - ${(product.price / 9000).toFixed(1)}g` : '5g - 10g')}
              </span>
            </div>
            <button
              className="product-cart-btn"
              aria-label="Add to cart"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product.id);
              }}
            >
              <CartIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Product Valuation Details Popover Dialog ── */}
      {isDetailOpen && (
        <div
          onClick={() => setIsDetailOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1.5px solid #eae6df',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            {/* Close Button Top Right */}
            <button
              onClick={() => setIsDetailOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                zIndex: 10,
              }}
            >
              x
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {/* Product Image Column */}
              <div
                style={{
                  flex: '1 1 280px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  position: 'relative',
                  minHeight: '280px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '24px',
                    background: product.color,
                    borderRadius: '16px',
                    opacity: 0.15,
                  }}
                />
                <img
                  src={product.img}
                  alt={product.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    zIndex: 2,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                  }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = '/Pearl_Gold_Choker.jpeg';
                  }}
                />
              </div>

              {/* Valuation Details Column */}
              <div
                style={{
                  flex: '1 1 320px',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: '#ffffff',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#b45309',
                    marginBottom: '8px',
                  }}
                >
                  {product.category}
                </span>

                <h3
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 400,
                    color: '#0f172a',
                    margin: '0 0 14px 0',
                    lineHeight: 1.15,
                    fontFamily: "'Great Vibes', cursive",
                  }}
                >
                  {product.name}
                </h3>

                {/* Info Block (Today's Live Rate) */}
                <div
                  style={{
                    background: '#fdfbf7',
                    border: '1px solid #f5efe6',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                    <span>Metal Category:</span>
                    <strong style={{ color: '#334155' }}>{isSilver ? 'Silver (999/925)' : 'Gold (22K/24K)'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                    <span>Today's Metal Rate:</span>
                    <strong style={{ color: '#b45309' }}>₹{rate.toLocaleString('en-IN')} / Gram</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                    <span>Ornaments Weight:</span>
                    <strong style={{ color: '#334155' }}>
                      {weightFrom === weightTo ? `${weightFrom} Grams` : `${weightFrom}g - ${weightTo}g`}
                    </strong>
                  </div>
                </div>

                {/* Main live value showcase */}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Valuation Estimate
                </span>
                <div
                  style={{
                    fontSize: '1.85rem',
                    fontWeight: 900,
                    color: '#1e293b',
                    marginTop: '4px',
                    marginBottom: '24px',
                    lineHeight: 1,
                  }}
                >
                  {weightFrom === weightTo ? (
                    <span>₹{Math.round(calculatedPriceMin).toLocaleString('en-IN')}</span>
                  ) : (
                    <span>
                      ₹{Math.round(calculatedPriceMin).toLocaleString('en-IN')} - ₹{Math.round(calculatedPriceMax).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Confirm details / Close Button */}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
