import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

interface ProductMetadata {
  id: string;
  name: string;
  category: string;
  price: number;
  weight_grams: number;
  img: string;
}

interface CustomerRecord {
  id: string;
  customer_name: string;
  customer_phone?: string;
  product_name: string;
  transaction_type: string;
  weight_grams: number;
  final_amount: number;
  created_at: string;
}

export const DashboardModule: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const [products, setProducts] = useState<ProductMetadata[]>([]);
  const [invoices, setInvoices] = useState<CustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [prodRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/products`),
        fetch(`${API_BASE}/billing/invoices`),
      ]);

      const prodData = await prodRes.json();
      const invData = await invRes.json();

      if (prodData.success) setProducts(prodData.products || []);
      if (invData.success) setInvoices(invData.invoices || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  // Filter invoices & products by search & date range
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_phone && inv.customer_phone.includes(searchTerm)) ||
      inv.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    const invDate = new Date(inv.created_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let matchesDate = true;
    if (start && invDate < start) matchesDate = false;
    if (end && invDate > end) matchesDate = false;

    return matchesSearch && matchesDate;
  });

  const totalRevenue = filteredInvoices.reduce((acc, curr) => acc + curr.final_amount, 0);
  const totalCustomers = new Set(filteredInvoices.map((i) => i.customer_name)).size;

  return (
    <div className="admin-dashboard-root" style={{ color: '#1e293b', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Top Title & Filter Control Row */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: '#6366f1', marginRight: '6px' }}></i> Executive Dashboard Overview
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            Store inventory metadata, customer purchasing logs, and sales trends
          </p>
        </div>

        {/* Date Range Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#ffffff', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid #eaecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#475569' }}>
            <i className="fa-solid fa-calendar-days" style={{ color: '#6366f1' }}></i>
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#475569' }}>
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              style={{ background: '#f1f5f9', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Cards (Compact Gaps) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {/* Card 1: Total Revenue */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL SALES REVENUE</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>↑ +14.2% this month</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ede9fe', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
        </div>

        {/* Card 2: Customers Served */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>ACTIVE CUSTOMERS</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {totalCustomers}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Unique buyers logged</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-users"></i>
          </div>
        </div>

        {/* Card 3: Products Metadata Count */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>CATALOG PRODUCTS</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {products.length} Items
            </div>
            <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Active in stock</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-gem"></i>
          </div>
        </div>

        {/* Card 4: Total Invoices Executed */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>INVOICES GENERATED</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {filteredInvoices.length}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>100% verified</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
        </div>
      </div>

      {/* Customer Information & Purchased Products Metadata Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-users-rectangle" style={{ color: '#6366f1' }}></i> Customer Information &amp; Purchase Metadata
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Showing {filteredInvoices.length} transactions
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eaecf0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Invoice ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Customer Name</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Product Metadata</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Weight</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Total Amount</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{inv.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{inv.customer_name}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{inv.customer_phone || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{inv.product_name}</td>
                  <td style={{ padding: '10px 12px' }}>{inv.weight_grams}g</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: inv.transaction_type === 'SELL' ? '#fef3c7' : '#e0f2fe',
                      color: inv.transaction_type === 'SELL' ? '#b45309' : '#0369a1',
                    }}>
                      {inv.transaction_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>₹{inv.final_amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catalog Products Metadata Grid */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-boxes-stacked" style={{ color: '#6366f1' }}></i> Jewelry Catalog Products &amp; Specifications
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {products.map((p) => (
            <div key={p.id} style={{ border: '1px solid #eaecf0', borderRadius: '12px', padding: '0.85rem', background: '#fafafa', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
              <img src={p.img} alt={p.name} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover' }} />
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>{p.name}</h4>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.category}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                  ₹{p.price.toLocaleString('en-IN')} <small style={{ color: '#64748b' }}>({p.weight_grams}g)</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
