-- SQL Schema for Jaya Bhavani Jewellers (Supabase PostgreSQL)

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  badge VARCHAR(50),
  img TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#e8d4c0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(100),
  count VARCHAR(50),
  href VARCHAR(100),
  img TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#d4b8a0',
  large BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed Sample Data
INSERT INTO public.products (id, name, category, price, old_price, badge, img, color) VALUES
('r1', 'Eternal Solitaire Ring', 'Diamond Ring', 89500, NULL, 'new', '/Eternal_Solitaire_Ring.jpg', '#e8d4c0'),
('r2', 'Rose Gold Eternity Band', 'Gold Ring', 42000, 52000, 'sale', '/Rose_Gold_Eternity_Band.png', '#d4b8a0'),
('r3', 'Floral Diamond Cluster', 'Diamond Ring', 135000, NULL, 'hot', '/Floral_Diamond_Cluster.png', '#c8a88c'),
('r4', 'Classic Gold Band', 'Gold Ring', 28000, NULL, NULL, '/classic_gold_band_ring.jpeg', '#e0c8b0'),
('n1', 'Diamond Pendant Set', 'Diamond Necklace', 120000, NULL, 'new', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop&q=85', '#dcc8b0'),
('n2', 'Gold Chain Layered Set', 'Gold Necklace', 68000, 82000, 'sale', 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop&q=85', '#cdb49a'),
('e1', 'Diamond Stud Earrings', 'Diamond Earrings', 45000, NULL, 'new', '/Diamond_Stud_Earrings.png', '#dcccc0'),
('np1', 'Diamond Nose Pin', 'Diamond Nose Pin', 18500, NULL, 'new', '/Diamond_Nose_Pin.jpeg', '#e8d8d0')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collections (id, name, tag, count, href, img, color, large) VALUES
('col-rings', 'Rings', 'New Arrivals', '48 Designs', '#rings', '/images/collection-rings.jpg', '#d4b8a0', TRUE),
('col-necklaces', 'Necklaces', 'Bestseller', '62 Designs', '#necklaces', '/images/collection-necklaces.jpg', '#cdb49a', FALSE),
('col-earrings', 'Earrings', 'Trending', '55 Designs', '#earrings', '/images/collection-earrings.jpg', '#dcccc0', FALSE),
('col-bangles', 'Bangles', 'Classic', '34 Designs', '#bangles', '/images/collection-bangles.jpg', '#e0c8b0', FALSE),
('col-nosepins', 'Nose Pins', 'Exclusive', '28 Designs', '#nosepins', '/nose_pins.jpg', '#e8d8d0', FALSE)
ON CONFLICT (id) DO NOTHING;
