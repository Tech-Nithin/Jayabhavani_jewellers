import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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

interface SilverPageProps {
  onBackToStore: () => void;
}

export default function SilverPage({ onBackToStore: _onBackToStore }: SilverPageProps) {
  const [_rates, setRates] = useState({
    silver_buy_value: 250,
    silver_sell_value: 270,
  });

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(`${API_BASE}/billing/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setRates({
            silver_buy_value: Number(data.rates.silver_buy_value) || 250,
            silver_sell_value: Number(data.rates.silver_sell_value) || 270,
          });
        }
      } catch (err) {
        // Fallback
      }
    }
    fetchRates();
  }, []);

  return (
    <div style={{ background: '#fdf9f4', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '20px' }}>
        <div className="section-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 className="section-title" style={{ fontSize: '3rem' }}>Pure Silver Articles & Jewellery</h1>
          <p className="section-desc">Handcrafted silver utensils, pooja items, coins, and oxidized silver ornaments</p>
        </div>

        {/* Product Grid */}
        <div className="products-grid">
          {silverProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
