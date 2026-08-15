import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

import { API_BASE } from '../config/apiConfig';

export const goldProducts: Product[] = [
  { id: 'g1', name: 'Royal 22K Gold Antique Necklace', category: '22K Gold Necklace', price: 145000, oldPrice: 160000, badge: 'hot', img: '/Diamond_Pendant_Set.jpg', color: '#e8d4c0' },
  { id: 'g2', name: 'Classic Gold Band Ring', category: '22K Gold Ring', price: 28000, oldPrice: null, badge: null, img: '/classic_gold_band_ring.jpeg', color: '#e0c8b0' },
  { id: 'g3', name: 'Rose Gold Eternity Band', category: '18K Gold Ring', price: 42000, oldPrice: 52000, badge: 'sale', img: '/Rose_Gold_Eternity_Band.png', color: '#d4b8a0' },
  { id: 'g4', name: 'Chandelier Gold Drop Earrings', category: '22K Gold Earrings', price: 38000, oldPrice: 48000, badge: 'sale', img: '/Chandelier_Gold_Drops.jpg', color: '#c8b0a0' },
  { id: 'g5', name: 'Gold Twisted Nose Pin', category: '22K Gold Nose Pin', price: 8200, oldPrice: 10000, badge: 'sale', img: '/Gold_Twisted_Nose_Pin.png', color: '#e0cbb0' },
  { id: 'g6', name: '22K Gold Layered Temple Chain', category: '22K Gold Necklace', price: 68000, oldPrice: 82000, badge: 'new', img: '/Gold_Chain_Layered_Set.jpg', color: '#cdb49a' },
  { id: 'g7', name: 'Pearl & Gold Choker Set', category: '22K Gold Choker', price: 54000, oldPrice: null, badge: 'new', img: '/Pearl_Gold_Choker.jpeg', color: '#e8d8c4' },
  { id: 'g8', name: '24K Gold Bullion Coin (10g)', category: '24K Gold Bullion', price: 147000, oldPrice: null, badge: 'hot', img: '/images/collection-rings.jpg', color: '#d4b8a0' },
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

interface GoldPageProps {
  onBackToStore: () => void;
  initialCategory?: string;
}

export default function GoldPage({ onBackToStore: _onBackToStore, initialCategory = 'all' }: GoldPageProps) {
  const [_rates, setRates] = useState({
    gold_buy_value: 0,
    gold_sell_value: 0,
  });

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(`${API_BASE}/billing/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setRates((prev) => ({
            gold_buy_value: data.rates.gold_buy_value !== undefined ? Number(data.rates.gold_buy_value) : prev.gold_buy_value,
            gold_sell_value: data.rates.gold_sell_value !== undefined ? Number(data.rates.gold_sell_value) : prev.gold_sell_value,
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
          gold_buy_value: e.detail.gold_buy_value !== undefined ? Number(e.detail.gold_buy_value) : prev.gold_buy_value,
          gold_sell_value: e.detail.gold_sell_value !== undefined ? Number(e.detail.gold_sell_value) : prev.gold_sell_value,
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
            gold_buy_value: r.gold_buy_value !== undefined ? Number(r.gold_buy_value) : prev.gold_buy_value,
            gold_sell_value: r.gold_sell_value !== undefined ? Number(r.gold_sell_value) : prev.gold_sell_value,
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
          const goldOnly = data.products
            .filter((p: any) => p.item_type === 'GOLD')
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category || '22K Gold',
              price: Number(p.price || 0),
              oldPrice: null,
              badge: 'new',
              img: p.img || '/images/collection-rings.jpg',
              color: '#e0c8b0',
              weightFrom: p.weight_from_grams ? Number(p.weight_from_grams) : undefined,
              weightTo: p.weight_to_grams ? Number(p.weight_to_grams) : undefined,
            }));
          setDbProducts(goldOnly);
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

  const getIconForCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('necklace') || lower.includes('choker') || lower.includes('chain')) return '📿';
    if (lower.includes('ring') || lower.includes('band')) return '💍';
    if (lower.includes('earring') || lower.includes('jhumka') || lower.includes('drop')) return '✨';
    if (lower.includes('nose')) return '💎';
    if (lower.includes('coin') || lower.includes('bullion') || lower.includes('bar')) return '🪙';
    if (lower.includes('bangle') || lower.includes('kada') || lower.includes('bracelet')) return '💫';
    return '✨';
  };

  const categories = [
    { id: 'all', label: 'All Gold', icon: '✨' },
    ...dbCategories.map(cat => ({
      id: cat.name.toLowerCase(),
      label: cat.name,
      icon: getIconForCategory(cat.name)
    }))
  ];

  const currentCat = categories.find((c) => {
    const selLower = selectedCategory.toLowerCase();
    const catLower = c.id.toLowerCase();
    return catLower === selLower || catLower.includes(selLower) || selLower.includes(catLower);
  }) || categories[0];

  // Typewriter effect for search placeholder (Pure ornament names)
  useEffect(() => {
    const placeholderPhrases = [
      "Rings",
      "Necklaces",
      "Bangles",
      "Nose Pins",
      "Temple Jewellery",
      "Solitaire Bands",
      "24K Bullion Coins"
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

  // Filter & Sort Logic:
  // Initially show hardcoded goldProducts.
  // When searching or selecting a category, fetch/include database products from inventory_products table.
  const hasActiveSearchOrFilter = searchQuery.trim() !== '' || selectedCategory !== 'all';
  const baseProducts = hasActiveSearchOrFilter
    ? [...goldProducts, ...dbProducts]
    : goldProducts;

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
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '380px',
          maxHeight: '420px',
          overflow: 'hidden',
          marginBottom: '48px',
          boxShadow: '0 20px 44px rgba(154, 122, 58, 0.22)',
          background: '#1a1614',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          alignItems: 'stretch'
        }}
      >
        <div style={{ padding: '48px max(32px, calc((100vw - 1280px)/2 + 32px))', zIndex: 2, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              marginBottom: '16px',
              color: '#fef8ee'
            }}
          >
            Masterpieces in 22K Hallmarked Gold
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '22px', maxWidth: '540px' }}>
            Discover timeless antique gold necklaces, handcrafted Lakshmi temple pendants, royal kadas, and emerald jhumkas forged by master artisans.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.86rem', color: '#e8d4c0' }}>
            <span>✔ 100% BIS 916 Hallmarked</span>
            <span>✔ Zero Deduction Guarantee</span>
            <span>✔ Certified Gold Assurance</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px', maxHeight: '420px', overflow: 'hidden' }}>
          <img
            src="/final_gold_ornament2.png"
            alt="Exclusive 22K Gold Antique Temple Ornaments"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
              filter: 'brightness(1.05) contrast(1.05)',
              transition: 'transform 0.6s ease'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, #1a1614 0%, transparent 40%, transparent 100%)'
            }}
          />
        </div>
      </div>

      {/* Header & Filter Bar & Product Grid */}
      <div className="container" style={{ paddingTop: '10px', paddingBottom: '20px' }}>
        <div className="section-header" style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>Curated Gold Designs</h2>
          <p className="section-desc">Handcrafted gold ornaments, solitaire bands, and heirloom temple chains</p>
        </div>

        {/* ── Unified Search & Category Pill Bar ── */}
        <div style={{ maxWidth: '960px', margin: '0 auto 36px auto', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: isSearchFocused ? '2px solid #000000' : '1.5px solid #000000',
              borderRadius: '99px',
              padding: '6px 8px 6px 20px',
              boxShadow: isSearchFocused ? '0 8px 30px rgba(180, 83, 9, 0.15)' : '0 6px 24px rgba(160, 100, 74, 0.08)',
              gap: '12px',
              transition: 'all 0.2s ease'
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
                          background: isSelected ? '#fef3c7' : 'transparent',
                          color: isSelected ? '#92400e' : '#334155',
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{cat.label}</span>
                        </div>
                        {isSelected && <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 'bold' }}>✓</span>}
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
              style={{
                background: 'linear-gradient(135deg, #d4b8a0, #b45309)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '99px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(180, 83, 9, 0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                flexShrink: 0
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search</span>
            </button>
          </div>

          {/* Popular Search Suggestions Overlay Popover (Exact Match to Reference Screenshot) */}
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
                      background: selectedCategory === cat.id ? '#fef3c7' : '#f1f5f9',
                      color: selectedCategory === cat.id ? '#92400e' : '#334155',
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
                  background: '#fff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  color: '#1e293b',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="popularity">Popularity</option>
                <option value="low-high">Price: Low to High</option>
                <option value="high-low">Price: High to Low</option>
              </select>
            </div>

            {(selectedCategory !== 'all' || searchQuery.trim() !== '' || sortBy !== 'popularity') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSortBy('popularity');
                }}
                style={{
                  color: '#dc2626',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                Clear search & filters
              </button>
            )}
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
