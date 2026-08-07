// ── Types for the Jaya Bhavani Jewellery App ──────────────

export type ProductBadge = 'new' | 'sale' | 'hot' | null;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice: number | null;
  badge: ProductBadge;
  img: string;
  color: string;
}

export interface CartItem extends Product {
  qty: number;
}

export type ProductSection = 'rings' | 'necklaces' | 'earrings';

export interface Collection {
  id: string;
  name: string;
  tag: string;
  count: string;
  href: string;
  img: string;
  color: string;
  large?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  text: string;
  avatar: string;
}
