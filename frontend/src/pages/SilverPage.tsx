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

interface SilverPageProps {
  onBackToStore: () => void;
}

export default function SilverPage({ onBackToStore: _onBackToStore }: SilverPageProps) {
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
