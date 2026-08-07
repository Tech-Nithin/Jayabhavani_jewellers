import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  weight_grams: number;
  img: string;
  stock_quantity?: number;
}

export const InventoryModule: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);

  // Form for adding product
  const [showAddForm, setShowAddForm] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Gold Ring',
    price: '',
    weight_grams: '',
    img: '/Eternal_Solitaire_Ring.jpg',
  });

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/products`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.weight_grams) return;

    try {
      const res = await fetch(`${API_BASE}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category,
          price: Number(productForm.price),
          weight_grams: Number(productForm.weight_grams),
          img: productForm.img,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProducts([data.product, ...products]);
        setShowAddForm(false);
        setProductForm({
          name: '',
          category: 'Gold Ring',
          price: '',
          weight_grams: '',
          img: '/Eternal_Solitaire_Ring.jpg',
        });
      }
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-dashboard-root" style={{ color: '#1e293b', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Title & Controls */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ color: '#6366f1', marginRight: '6px' }}></i> Store Inventory &amp; Stock Catalog
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            All available jewelry products with images, weight metadata, and live stock tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className={showAddForm ? 'fa-solid fa-xmark' : 'fa-solid fa-plus'}></i>
          {showAddForm ? 'Close Form' : 'Add New Product'}
        </button>
      </div>

      {/* Add Product Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateProduct} style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.25rem', border: '1px solid #6366f1', boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sparkles"></i> Add New Jewelry Inventory Item
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Product Name</label>
              <input
                type="text"
                placeholder="e.g. Royal Gold Necklace"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Category</label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
              >
                <option value="Gold Ring">Gold Ring</option>
                <option value="Diamond Ring">Diamond Ring</option>
                <option value="Gold Chain">Gold Chain</option>
                <option value="Gold Bangle">Gold Bangle</option>
                <option value="Silver Anklet">Silver Anklet</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Product Weight (g)</label>
              <input
                type="number"
                step="0.001"
                placeholder="12.500"
                value={productForm.weight_grams}
                onChange={(e) => setProductForm({ ...productForm, weight_grams: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Price (₹)</label>
              <input
                type="number"
                placeholder="85000"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Image URL / Asset</label>
              <input
                type="text"
                placeholder="/Eternal_Solitaire_Ring.jpg"
                value={productForm.img}
                onChange={(e) => setProductForm({ ...productForm, img: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add Product To Inventory
            </button>
          </div>
        </form>
      )}

      {/* Inventory Items Grid (Compact Gaps) */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Loading inventory items...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid #eaecf0',
                boxShadow: '0 6px 20px rgba(0,0,0,0.02)',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'center',
              }}
            >
              <img
                src={prod.img}
                alt={prod.name}
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
              />
              <div>
                <span style={{ fontSize: '0.68rem', color: '#6366f1', background: '#ede9fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {prod.category}
                </span>
                <h4 style={{ margin: '3px 0', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>{prod.name}</h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Weight: {prod.weight_grams}g</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                  ₹{prod.price.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
