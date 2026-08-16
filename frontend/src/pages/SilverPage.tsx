import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { API_BASE } from '../config/apiConfig';

export const silverProducts: Product[] = [
  { id: 's1', name: '999 Pure Silver Coin (50g)', category: '999 Silver Coin', price: 13500, oldPrice: 15000, badge: 'hot', img: '/Pearl_Drop_Earrings.jpg', color: '#e8e0d4' },
  { id: 's2', name: 'Handcrafted Silver Pooja Kalash', category: 'Silver Utensil', price: 24500, oldPrice: null, badge: 'new', img: '/images/collection-necklaces.jpg', color: '#d4b8a0' },
  { id: 's3', name: 'Oxidized Silver Choker Set', category: 'Silver Necklace', price: 18000, oldPrice: 22000, badge: 'sale', img: '/Pearl_Gold_Choker.jpeg', color: '#e8d8c4' },
  { id: 's4', name: 'Silver Anklets & Payal Pair', category: 'Silver Jewellery', price: 9500, oldPrice: null, badge: 'new', img: '/Pearl_Drop_Earrings.jpg', color: '#dcccc0' },
  { id: 's5', name: '92.5 Sterling Silver Ring', category: '925 Silver Ring', price: 4200, oldPrice: null, badge: null, img: '/Rose_Gold_Eternity_Band.png', color: '#e0c8b0' },
  { id: 's6', name: 'Silver Dining Thali Set', category: 'Silver Utensil', price: 45000, oldPrice: 52000, badge: 'sale', img: '/images/collection-bangles.jpg', color: '#cdb49a' },
  { id: 's7', name: 'Emerald Gemstone Silver Earrings', category: '925 Silver Earrings', price: 8900, oldPrice: null, badge: 'hot', img: '/Emerald_Hoop_Earrings.jpeg', color: '#b8c8b0' },
  { id: 's8', name: '999 Silver Biscuit (100g)', category: '999 Silver Bullion', price: 27000, oldPrice: null, badge: 'hot', img: '/Ruby_Drop_Necklace.jpg', color: '#d4a090' },
];

const areCategoriesMatching = (selCat: string, prodCat: string): boolean => {
  const sel = selCat.toLowerCase().trim();
  const prod = prodCat.toLowerCase().trim();
  
  if (sel === 'all') return true;
  if (sel === prod) return true;
  
  const normalize = (str: string) => {
    return str.split(/\s+/).map(w => w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w);
  };
  
  const selWords = normalize(sel);
  const prodWords = normalize(prod);
  
  return selWords.some(selW => prodWords.some(prodW => prodW.includes(selW) || selW.includes(prodW)));
};

interface SilverPageProps {
  onBackToStore: () => void;
  initialCategory?: string;
}

export default function SilverPage({ onBackToStore: _onBackToStore, initialCategory = 'all' }: SilverPageProps) {
  const [_rates, setRates] = useState({
    silver_buy_value: 0,
    silver_sell_value: 0,
  });

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(`${API_BASE}/billing/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setRates((prev) => ({
            silver_buy_value: data.rates.silver_buy_value !== undefined ? Number(data.rates.silver_buy_value) : prev.silver_buy_value,
            silver_sell_value: data.rates.silver_sell_value !== undefined ? Number(data.rates.silver_sell_value) : prev.silver_sell_value,
          }));
        }
      } catch (err) {
        // Fallback
      }
    }
    fetchRates();

    const handleLocalUpdate = (e: any) => {
      if (e.detail) {
        setRates((prev) => ({
          silver_buy_value: e.detail.silver_buy_value !== undefined ? Number(e.detail.silver_buy_value) : prev.silver_buy_value,
          silver_sell_value: e.detail.silver_sell_value !== undefined ? Number(e.detail.silver_sell_value) : prev.silver_sell_value,
        }));
      } else {
        fetchRates();
      }
    };
    window.addEventListener('jbj_metal_rates_updated', handleLocalUpdate);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('jbj_rates_channel');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'RATES_UPDATED' && msg.data?.rates) {
          const r = msg.data.rates;
          setRates((prev) => ({
            silver_buy_value: r.silver_buy_value !== undefined ? Number(r.silver_buy_value) : prev.silver_buy_value,
            silver_sell_value: r.silver_sell_value !== undefined ? Number(r.silver_sell_value) : prev.silver_sell_value,
          }));
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('jbj_metal_rates_updated', handleLocalUpdate);
      if (channel) channel.close();
    };
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [placeholderText, setPlaceholderText] = useState<string>('');
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchDbProducts() {
      try {
        const url = selectedCategory === 'all'
          ? `${API_BASE}/inventory/products`
          : `${API_BASE}/inventory/products?category=${encodeURIComponent(selectedCategory)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          const silverOnly = data.products
            .filter((p: any) => p.item_type === 'SILVER')
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category || 'Pure Silver',
              price: Number(p.price || 0),
              oldPrice: null,
              badge: 'new',
              img: p.img || '/images/collection-necklaces.jpg',
              color: '#e8e0d4',
              weightFrom: p.weight_from_grams ? Number(p.weight_from_grams) : undefined,
              weightTo: p.weight_to_grams ? Number(p.weight_to_grams) : undefined,
            }));
          setDbProducts(silverOnly);
        }
      } catch (err) {
        console.warn('Failed to fetch db products:', err);
      }
    }
    fetchDbProducts();
  }, [selectedCategory]);

  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE}/inventory/categories`);
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          setDbCategories(data.categories);
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      }
    }
    fetchCategories();
  }, []);

  const categories = [
    { id: 'all', label: 'All Silver' },
    ...dbCategories.map(cat => ({
      id: cat.name.toLowerCase(),
      label: cat.name
    }))
  ];

  const currentCat = categories.find((c) => {
    const selLower = selectedCategory.toLowerCase();
    const catLower = c.id.toLowerCase();
    return catLower === selLower || catLower.includes(selLower) || selLower.includes(catLower);
  }) || categories[0];

  // Typewriter effect for search placeholder
  useEffect(() => {
    const placeholderPhrases = [
      "Coins",
      "Pooja Kalash",
      "Sterling Rings",
      "Anklets",
      "Choker Sets",
      "Dining Sets",
      "Silver Biscuits"
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: number;

    const typeEffect = () => {
      const currentPhrase = placeholderPhrases[phraseIndex];

      if (isDeleting) {
        setPlaceholderText(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholderText(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 35 : 75;

      if (!isDeleting && charIndex === currentPhrase.length) {
        speed = 1800; // Pause when phrase is fully typed
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % placeholderPhrases.length;
        speed = 350; // Pause before typing next phrase
      }

      timer = window.setTimeout(typeEffect, speed);
    };

    timer = window.setTimeout(typeEffect, 300);

    return () => clearTimeout(timer);
  }, []);

  const hasActiveSearchOrFilter = searchQuery.trim() !== '' || selectedCategory !== 'all';
  const baseProducts = hasActiveSearchOrFilter
    ? [...silverProducts, ...dbProducts]
    : silverProducts;

  const filteredProducts = baseProducts.filter((p) => {
    const matchesCategory = areCategoriesMatching(selectedCategory, p.category);
    const matchesQuery = searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'low-high') return a.price - b.price;
    if (sortBy === 'high-low') return b.price - a.price;
    return 0; // popularity default
  });

  return (
    <div style={{ background: '#fdf9f4', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Featured Full-Bleed Showcase Banner */}
      <div className="showcase-banner-silver">
        {/* Background Image Stretched Across */}
        <img
          src="/silver_bg.png"
          alt="Exclusive Pure Silver Pooja Ornaments & Utensils"
          className="showcase-banner-silver-img"
        />

        {/* Foreground Content */}
        <div className="showcase-banner-silver-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center' }}>
          <h1
            className="shimmer-text-silver"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(2.0rem, 4vw, 3.4rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              marginBottom: '16px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.75)'
            }}
          >
            Masterpieces in Pure Silver Ornaments
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#ffffff',
              lineHeight: 1.6,
              marginBottom: '22px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
              maxWidth: '600px'
            }}
          >
            Discover handcrafted silver pooja articles, sterling silver rings, luxury dining sets, and oxidized ornaments forged by master artisans.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '0.86rem',
              color: '#f1f5f9',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)',
              fontWeight: 600,
              justifyContent: 'center'
            }}
          >
            <span>✔ 100% BIS Hallmarked</span>
            <span>✔ Zero Deduction Guarantee</span>
            <span>✔ Certified Silver Assurance</span>
          </div>
        </div>
      </div>

      {/* Header & Filter Bar & Product Grid */}
      <div className="container" style={{ paddingTop: '10px', paddingBottom: '20px' }}>
        <div className="section-header" style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>Curated Silver Designs</h2>
          <p className="section-desc">Handcrafted silver articles, pooja items, coins, and sterling silver ornaments</p>
        </div>

        {/* ── Unified Search & Category Pill Bar ── */}
        <div style={{ maxWidth: '960px', margin: '0 auto 36px auto', position: 'relative' }}>
          <div
            className="search-bar-container"
            style={{
              border: isSearchFocused ? '2px solid #475569' : '1.5px solid #cbd5e1',
              boxShadow: isSearchFocused ? '0 8px 30px rgba(71, 85, 105, 0.15)' : '0 6px 24px rgba(100, 116, 139, 0.08)',
            }}
          >
            {/* Left Category Custom Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                onBlur={() => setTimeout(() => setIsCategoryOpen(false), 220)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                  padding: '6px 12px 6px 4px',
                  borderRadius: '8px'
                }}
              >
                <span>{currentCat.label}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: '#64748b',
                    transition: 'transform 0.2s ease',
                    transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Custom Dropdown Floating Menu */}
              {isCategoryOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 14px)',
                    left: 0,
                    minWidth: '210px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 14px 36px rgba(0, 0, 0, 0.14)',
                    padding: '8px',
                    zIndex: 110
                  }}
                >
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setIsCategoryOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isSelected ? '#e2e8f0' : 'transparent',
                          color: isSelected ? '#0f172a' : '#334155',
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{cat.label}</span>
                        </div>
                        {isSelected && <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vertical Divider Line */}
            <div style={{ width: '1px', height: '24px', background: '#cbd5e1', flexShrink: 0 }} />

            {/* Center Text Search Input with Typewriter Placeholder */}
            <input
              type="text"
              placeholder={placeholderText || ""}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.95rem',
                color: '#1e293b',
                fontFamily: 'inherit'
              }}
            />

            {/* Right Action Search Button */}
            <button
              onClick={() => { }}
              className="search-bar-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span className="search-btn-text">Search</span>
            </button>
          </div>

          {/* Popular Search Suggestions Overlay Popover */}
          {(isSearchFocused && searchQuery.trim() === '') && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '100%',
                maxWidth: '680px',
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
                padding: '24px 28px',
                zIndex: 100
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '14px', letterSpacing: '0.01em' }}>
                Popular
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsSearchFocused(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedCategory === cat.id ? '#e2e8f0' : '#f1f5f9',
                      color: selectedCategory === cat.id ? '#0f172a' : '#475569',
                      fontSize: '0.86rem',
                      fontWeight: selectedCategory === cat.id ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort & Reset Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '20px',
              marginTop: '16px',
              paddingRight: '4px',
              fontSize: '0.82rem',
              color: '#475569'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  background: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="popularity">Popularity</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="products-grid">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
