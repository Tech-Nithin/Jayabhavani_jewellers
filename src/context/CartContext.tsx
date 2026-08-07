import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CartItem, Product } from '../types';
import { allProducts } from '../data/products';

// ── CART CONTEXT ──────────────────────────────────────

interface CartContextValue {
  cart: CartItem[];
  wishlist: string[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  changeQty: (id: string, delta: number) => void;
  toggleWishlist: (id: string) => void;
  cartTotal: number;
  cartCount: number;
  wishlistCount: number;
  toast: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('jaya_bhavani_cart') || '[]'); }
    catch { return []; }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('jaya_bhavani_wishlist') || '[]'); }
    catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toast, setToast] = useState('');

  const persist = (key: string, val: unknown) =>
    localStorage.setItem(key, JSON.stringify(val));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const openCart  = useCallback(() => setIsCartOpen(true),  []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = useCallback((id: string) => {
    const product = allProducts.find((p: Product) => p.id === id);
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === id);
      const next = existing
        ? prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { ...product, qty: 1 }];
      persist('jaya_bhavani_cart', next);
      return next;
    });
    showToast(`✓ "${product.name}" added to cart`);
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => {
      const next = prev.filter(c => c.id !== id);
      persist('jaya_bhavani_cart', next);
      return next;
    });
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const next = prev.map(c =>
        c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c
      );
      persist('jaya_bhavani_cart', next);
      return next;
    });
  }, []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist(prev => {
      const has = prev.includes(id);
      const next = has ? prev.filter(w => w !== id) : [...prev, id];
      persist('jaya_bhavani_wishlist', next);
      showToast(has ? '♡ Removed from wishlist' : '♥ Added to wishlist');
      return next;
    });
  }, []);

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const wishlistCount = wishlist.length;

  return (
    <CartContext.Provider value={{
      cart, wishlist, isCartOpen,
      openCart, closeCart,
      addToCart, removeFromCart, changeQty,
      toggleWishlist,
      cartTotal, cartCount, wishlistCount,
      toast,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
