import type { Product, Collection, Testimonial } from '../types';

export const rings: Product[] = [
  { id: 'r1', name: 'Eternal Solitaire Ring', category: 'Diamond Ring', price: 89500, oldPrice: null, badge: 'new', img: '/Eternal_Solitaire_Ring.jpg', color: '#e8d4c0' },
  { id: 'r2', name: 'Rose Gold Eternity Band', category: 'Gold Ring', price: 42000, oldPrice: 52000, badge: 'sale', img: '/Rose_Gold_Eternity_Band.png', color: '#d4b8a0' },
  { id: 'r3', name: 'Floral Diamond Cluster', category: 'Diamond Ring', price: 135000, oldPrice: null, badge: 'hot', img: '/Floral_Diamond_Cluster.png', color: '#c8a88c' },
  { id: 'r4', name: 'Classic Gold Band', category: 'Gold Ring', price: 28000, oldPrice: null, badge: null, img: '/classic_gold_band_ring.jpeg', color: '#e0c8b0' },
];

export const necklaces: Product[] = [
  { id: 'n1', name: 'Diamond Pendant Set', category: 'Diamond Necklace', price: 120000, oldPrice: null, badge: 'new', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop&q=85', color: '#dcc8b0' },
  { id: 'n2', name: 'Gold Chain Layered Set', category: 'Gold Necklace', price: 68000, oldPrice: 82000, badge: 'sale', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop&q=85', color: '#cdb49a' },
  { id: 'n3', name: 'Pearl & Gold Choker', category: 'Pearl Necklace', price: 54000, oldPrice: null, badge: null, img: '/Pearl_Gold_Choker.jpeg', color: '#e8d8c4' },
  { id: 'n4', name: 'Ruby Drop Necklace', category: 'Gemstone Necklace', price: 96000, oldPrice: null, badge: 'hot', img: '/Ruby_Drop_Necklace.jpg', color: '#d4a090' },
];

export const earrings: Product[] = [
  { id: 'e1', name: 'Diamond Stud Earrings', category: 'Diamond Earrings', price: 45000, oldPrice: null, badge: 'new', img: '/Diamond_Stud_Earrings.png', color: '#dcccc0' },
  { id: 'e2', name: 'Chandelier Gold Drops', category: 'Gold Earrings', price: 38000, oldPrice: 48000, badge: 'sale', img: '/Chandelier_Gold_Drops.jpg', color: '#c8b0a0' },
  { id: 'e3', name: 'Emerald Hoop Earrings', category: 'Gemstone Earrings', price: 62000, oldPrice: null, badge: null, img: '/Emerald_Hoop_Earrings.jpeg', color: '#b8c8b0' },
  { id: 'e4', name: 'Pearl Drop Earrings', category: 'Pearl Earrings', price: 29000, oldPrice: null, badge: 'hot', img: '/Pearl_Drop_Earrings.jpg', color: '#e8e0d4' },
];

export const nosepins: Product[] = [
  { id: 'np1', name: 'Diamond Nose Pin', category: 'Diamond Nose Pin', price: 18500, oldPrice: null, badge: 'new', img: '/Diamond_Nose_Pin.jpeg', color: '#e8d8d0' },
  { id: 'np2', name: 'Gold Twisted Nose Pin', category: 'Gold Nose Pin', price: 8200, oldPrice: 10000, badge: 'sale', img: '/Gold_Twisted_Nose_Pin.png', color: '#e0cbb0' },
  { id: 'np3', name: 'Ruby Stud Nose Pin', category: 'Gemstone Nose Pin', price: 14000, oldPrice: null, badge: null, img: '/ruby_nose_pin.png', color: '#d4b0a0' },
  { id: 'np4', name: 'Pearl Drop Nose Pin', category: 'Pearl Nose Pin', price: 9500, oldPrice: null, badge: 'hot', img: '/nose_pins.jpg', color: '#e8e0d4' },
];

export const allProducts: Product[] = [...rings, ...necklaces, ...earrings, ...nosepins];

export const collections: Collection[] = [
  { id: 'col-rings', name: 'Rings', tag: 'New Arrivals', count: '48 Designs', href: '#rings', img: '/images/collection-rings.jpg', color: '#d4b8a0', large: true },
  { id: 'col-necklaces', name: 'Necklaces', tag: 'Bestseller', count: '62 Designs', href: '#necklaces', img: '/images/collection-necklaces.jpg', color: '#cdb49a' },
  { id: 'col-earrings', name: 'Earrings', tag: 'Trending', count: '55 Designs', href: '#earrings', img: '/images/collection-earrings.jpg', color: '#dcccc0' },
  { id: 'col-bangles', name: 'Bangles', tag: 'Classic', count: '34 Designs', href: '#bangles', img: '/images/collection-bangles.jpg', color: '#e0c8b0' },
  { id: 'col-nosepins', name: 'Nose Pins', tag: 'Exclusive', count: '28 Designs', href: '#nosepins', img: '/nose_pins.jpg', color: '#e8d8d0' },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Priya Sharma',
    location: 'Mumbai',
    avatar: 'P',
    text: '"The diamond engagement ring I purchased exceeded every expectation. The craftsmanship is breathtaking and my fiancée was in tears of joy. Jaya Bhavani Jewellers truly creates memories."',
  },
  {
    id: 't2',
    name: 'Ananya Reddy',
    location: 'Bangalore',
    avatar: 'A',
    text: '"Absolutely stunning gold necklace. The quality is unmatched — you can feel the difference in each link. Fast delivery and beautifully packaged. Will definitely buy again!"',
  },
  {
    id: 't3',
    name: 'Rohan Mehta',
    location: 'Delhi',
    avatar: 'R',
    text: '"Gifted my mother a pair of diamond earrings for her anniversary. She hasn\'t taken them off since! The certification and packaging made it feel truly special."',
  },
  {
    id: 't4',
    name: 'Meera Iyer',
    location: 'Chennai',
    avatar: 'M',
    text: '"Purchased a bridal set for my wedding. Every guest complimented the jewellery. The team was so helpful in choosing the perfect pieces. Truly a luxury experience."',
  },
];
