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
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Title & Controls */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706', marginRight: '8px' }}></i> Store Inventory &amp; Stock Catalog
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
            All available jewelry products with images, weight metadata, and live stock tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(180,83,9,0.3)',
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
        <form onSubmit={handleCreateProduct} style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.25rem', border: '1px solid #d97706', boxShadow: '0 8px 24px rgba(217,119,6,0.12)' }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', color: '#b45309', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sparkles"></i> Add New Jewelry Inventory Item
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a3e35' }}>Product Name</label>
              <input
                type="text"
                placeholder="e.g. Royal Gold Necklace"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d4c7b8', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a3e35' }}>Category</label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d4c7b8', marginTop: '0.15rem' }}
              >
                <option value="Gold Ring">Gold Ring</option>
                <option value="Diamond Ring">Diamond Ring</option>
                <option value="Gold Chain">Gold Chain</option>
                <option value="Gold Bangle">Gold Bangle</option>
                <option value="Silver Anklet">Silver Anklet</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a3e35' }}>Product Weight (g)</label>
              <input
                type="number"
                step="0.001"
                placeholder="12.500"
                value={productForm.weight_grams}
                onChange={(e) => setProductForm({ ...productForm, weight_grams: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d4c7b8', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a3e35' }}>Price (₹)</label>
              <input
                type="number"
                placeholder="85000"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d4c7b8', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a3e35' }}>Image URL / Asset</label>
              <input
                type="text"
                placeholder="/Eternal_Solitaire_Ring.jpg"
                value={productForm.img}
                onChange={(e) => setProductForm({ ...productForm, img: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d4c7b8', marginTop: '0.15rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(180,83,9,0.3)' }}
            >
              Add Product To Inventory
            </button>
          </div>
        </form>
      )}

      {/* Inventory Items Grid (Showroom Cards Theme) */}
      {loading ? (
        <p style={{ color: '#786a5e' }}>Loading inventory items...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid #e6decb',
                boxShadow: '0 6px 20px rgba(24,19,16,0.03)',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'center',
              }}
            >
              <img
                src={prod.img}
                alt={prod.name}
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e6decb' }}
              />
              <div>
                <span style={{ fontSize: '0.68rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '20px', fontWeight: 800, border: '1px solid #fde68a' }}>
                  {prod.category}
                </span>
                <h4 style={{ margin: '4px 0 2px 0', fontSize: '0.88rem', color: '#181310', fontWeight: 800 }}>{prod.name}</h4>
                <div style={{ fontSize: '0.75rem', color: '#786a5e' }}>Weight: {prod.weight_grams}g</div>
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
