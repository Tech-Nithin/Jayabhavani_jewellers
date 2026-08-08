import { useState, useEffect } from 'react';
import { formatPrice } from '../utils';

interface AnnouncementBarProps {
  message?: string;
}

interface MetalRates {
  gold_buy_value: number;
  gold_sell_value: number;
  silver_buy_value: number;
  silver_sell_value: number;
}

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

export default function AnnouncementBar({ message }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(
    !sessionStorage.getItem('jaya_bhavani_ann_closed')
  );
  const [rates, setRates] = useState<MetalRates>({
    gold_buy_value: 14200,
    gold_sell_value: 14700,
    silver_buy_value: 250,
    silver_sell_value: 270,
  });

  useEffect(() => {
    async function fetchMetalRates() {
      try {
        const res = await fetch(`${API_BASE}/billing/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setRates({
            gold_buy_value: Number(data.rates.gold_buy_value) || 14200,
            gold_sell_value: Number(data.rates.gold_sell_value) || 14700,
            silver_buy_value: Number(data.rates.silver_buy_value) || 250,
            silver_sell_value: Number(data.rates.silver_sell_value) || 270,
          });
        }
      } catch (err) {
        // Fall back gracefully to initial default rates
      }
    }
    fetchMetalRates();
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem('jaya_bhavani_ann_closed', '1');
  };

  if (!visible) return null;

  const displayMessage = message || `✦ Gold Buy: ${formatPrice(rates.gold_buy_value)}/g \u00a0|\u00a0 ✦ Gold Sell: ${formatPrice(rates.gold_sell_value)}/g \u00a0|\u00a0 ✦ Silver Buy: ${formatPrice(rates.silver_buy_value)}/g \u00a0|\u00a0 ✦ Silver Sell: ${formatPrice(rates.silver_sell_value)}/g`;

  return (
    <div className="announcement-bar" id="announcement-bar">
      <p>{displayMessage}</p>
      <button
        className="close-announcement"
        id="close-announcement"
        aria-label="Close announcement"
        onClick={handleClose}
      >
        ✕
      </button>
    </div>
  );
}

