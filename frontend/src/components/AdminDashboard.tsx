import { useState } from 'react';
import { allProducts, collections } from '../data/products';
import { DashboardModule } from '../dashboard-frontend';
import { BillingModule } from '../billing-frontend/BillingModule';
import { FinanceModule } from '../finance-frontend/FinanceModule';
import { InventoryModule } from '../inventory-frontend';

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

        {/* Central Router Area Connecting All 4 Modules */}
        <main style={{ flex: 1, padding: '2rem 2.5rem', background: '#f8fafc' }}>
          {activeTab === 'dashboard' && (
            <DashboardModule user={user} productList={productList} collectionsList={collections} />
          )}

          {activeTab === 'billing' && (
            <BillingModule />
          )}

          {activeTab === 'finance' && (
            <FinanceModule />
          )}

          {activeTab === 'inventory' && (
            <InventoryModule productList={productList} />
          )}
        </main>
      </div>
    </div>
  );
}
