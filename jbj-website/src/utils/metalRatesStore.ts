import { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';

export interface MetalRates {
  gold_buy_value: number;
  gold_sell_value: number;
  silver_buy_value: number;
  silver_sell_value: number;
  gold_rate_per_gram?: number;
  silver_rate_per_gram?: number;
}

const STORAGE_KEY = 'jbj_website_cached_metal_rates';

const defaultRates: MetalRates = {
  gold_buy_value: 0,
  gold_sell_value: 0,
  silver_buy_value: 0,
  silver_sell_value: 0,
};

let currentRates: MetalRates = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.gold_buy_value === 'number') {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return defaultRates;
})();

const listeners = new Set<(rates: MetalRates) => void>();
let fetchPromise: Promise<MetalRates> | null = null;
let isInitialized = false;

function notifyListeners() {
  listeners.forEach((listener) => listener(currentRates));
}

export function updateLocalRates(newRates: Partial<MetalRates>) {
  currentRates = {
    ...currentRates,
    ...newRates,
    gold_buy_value: newRates.gold_buy_value !== undefined ? Number(newRates.gold_buy_value) : currentRates.gold_buy_value,
    gold_sell_value: newRates.gold_sell_value !== undefined ? Number(newRates.gold_sell_value) : currentRates.gold_sell_value,
    silver_buy_value: newRates.silver_buy_value !== undefined ? Number(newRates.silver_buy_value) : currentRates.silver_buy_value,
    silver_sell_value: newRates.silver_sell_value !== undefined ? Number(newRates.silver_sell_value) : currentRates.silver_sell_value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRates));
  } catch {
    // Ignore storage write errors
  }
  notifyListeners();
}

/**
 * Fetches metal rates ONCE from API. De-duplicates concurrent calls.
 */
export async function getOrFetchMetalRates(): Promise<MetalRates> {
  if (isInitialized && currentRates.gold_buy_value > 0) {
    return currentRates;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/rates`);
      const data = await res.json();
      if (data.success && data.rates) {
        updateLocalRates(data.rates);
        isInitialized = true;
      }
    } catch (err) {
      console.warn('⚠️ Website metal rates fetch fallback warning:', err);
    } finally {
      fetchPromise = null;
    }
    return currentRates;
  })();

  return fetchPromise;
}

if (typeof window !== 'undefined') {
  // Listen for local CustomEvents
  window.addEventListener('jbj_metal_rates_updated', (e: any) => {
    if (e.detail) {
      updateLocalRates(e.detail);
    } else {
      getOrFetchMetalRates();
    }
  });

  // Listen for cross-tab BroadcastChannel events
  try {
    const channel = new BroadcastChannel('jbj_rates_channel');
    channel.onmessage = (msg) => {
      if (msg.data?.type === 'RATES_UPDATED' && msg.data?.rates) {
        updateLocalRates(msg.data.rates);
      }
    };
  } catch {
    // Fallback if unsupported
  }
}

/**
 * Custom React Hook: Returns current rates and subscribes to real-time rate pushes.
 * Performs 1 single API fetch on initial website load if uninitialized.
 */
export function useMetalRates(): MetalRates {
  const [rates, setRates] = useState<MetalRates>(currentRates);

  useEffect(() => {
    listeners.add(setRates);

    if (!isInitialized || currentRates.gold_buy_value === 0) {
      getOrFetchMetalRates();
    }

    return () => {
      listeners.delete(setRates);
    };
  }, []);

  return rates;
}
