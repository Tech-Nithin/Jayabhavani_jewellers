import { useState } from 'react';
import { allProducts, collections } from '../data/products';

interface AdminDashboardProps {
  user: { name: string; email: string };
  onLogout: () => void;
  onBackToStore?: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'billing' | 'finance' | 'inventory'>('dashboard');
  const [productList] = useState(allProducts);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>
      {/* Top Admin Navigation Header */}
      <header 
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {/* Brand Logo & Title in single line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/JB_logo.png" alt="Jaya Bhavani Jewellers" style={{ height: '40px' }} />
          <h1 
            style={{ 
              fontFamily: "'Cinzel', serif", 
              fontSize: '1.35rem', 
              margin: 0, 
              color: '#0f172a', 
              fontWeight: 700, 
              letterSpacing: '1px',
              whiteSpace: 'nowrap'
            }}
          >
            JAYA BHAVANI JEWELLERS
          </h1>
        </div>

        {/* Right side: Only Logout Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 73px)' }}>
        {/* Sidebar Navigation: Dashboard, Billing, Finance, Inventory */}
        <aside style={{ width: '240px', background: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '1.5rem 1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'billing', label: 'Billing' },
              { id: 'finance', label: 'Finance' },
              { id: 'inventory', label: 'Inventory' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: isActive ? '#fffbeb' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #d97706' : '4px solid transparent',
                    color: isActive ? '#b45309' : '#64748b',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{tab.label}</span>
                  {isActive && <span style={{ fontSize: '0.75rem', color: '#d97706' }}>●</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content View */}
        <main style={{ flex: 1, padding: '2rem 2.5rem', background: '#f8fafc' }}>
          {/* Dashboard Module */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                  Dashboard Overview
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Key metrics & performance summary
                </p>
              </div>

              {/* Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {[
                  { title: 'Total Inventory Items', value: productList.length, note: 'Rings, Necklaces, Earrings, Nose Pins' },
                  { title: 'Active Collections', value: collections.length, note: '5 Exclusive Categories' },
                  { title: 'Monthly Revenue', value: '₹18,45,000', note: '+12% from last month' },
                  { title: 'Registered Admin', value: user.name, note: user.email },
                ].map((card, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '1.5rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                      {card.title}
                    </span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>
                      {card.value}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {card.note}
                    </span>
                  </div>
                ))}
              </div>

              {/* Featured Products Summary */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: '#0f172a', fontWeight: 600, marginBottom: '1.25rem', marginTop: 0 }}>
                  Top Performing Products
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {productList.slice(0, 4).map(p => (
                    <div key={p.id} style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '12px' }}>
                      <img src={p.img} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>₹{p.price.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Billing Module */}
          {activeTab === 'billing' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                  Billing & Invoicing
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Manage customer invoices and billing history
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Recent Billing Statements</h3>
                  <button style={{ padding: '8px 16px', background: '#b45309', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    + Generate New Invoice
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                      <th style={{ padding: '12px 16px' }}>Invoice ID</th>
                      <th style={{ padding: '12px 16px' }}>Customer</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'INV-1092', customer: 'Ananya Reddy', date: '07 Aug 2026', amount: '₹1,35,000', status: 'Paid' },
                      { id: 'INV-1091', customer: 'Priya Sharma', date: '06 Aug 2026', amount: '₹89,500', status: 'Paid' },
                      { id: 'INV-1090', customer: 'Rohan Mehta', date: '05 Aug 2026', amount: '₹45,000', status: 'Paid' },
                    ].map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{inv.id}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.customer}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{inv.date}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#b45309' }}>{inv.amount}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600 }}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Finance Module */}
          {activeTab === 'finance' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                  Financial Management
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Accounts, revenue reports, and payment analytics
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Revenue YTD', value: '₹2.45 Cr', change: '+18% vs last year' },
                  { label: 'Pending Receivables', value: '₹3,20,000', change: '4 outstanding invoices' },
                  { label: 'Gold Bullion Reserves', value: '14.2 kg', change: '99.9% 24K Purity' },
                ].map((f, i) => (
                  <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{f.label}</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>{f.value}</div>
                    <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>{f.change}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Module */}
          {activeTab === 'inventory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                    Inventory Management ({productList.length} Items)
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                    Track stock availability, categories, and retail pricing
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Item</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Category</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Price</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productList.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img src={item.img} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                        </td>
                        <td style={{ padding: '12px 20px', color: '#64748b' }}>{item.category}</td>
                        <td style={{ padding: '12px 20px', color: '#0f172a', fontWeight: 600 }}>₹{item.price.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600 }}>
                            In Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
