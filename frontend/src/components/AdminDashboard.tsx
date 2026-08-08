import React, { useState, useEffect } from 'react';
import { DashboardModule } from '../dashboard-frontend/DashboardModule';
import { BillingModule } from '../billing-frontend/BillingModule';
import { FinanceModule } from '../finance-frontend/FinanceModule';
import { InventoryModule } from '../inventory-frontend/InventoryModule';
import { useWindowWidth } from '../utils/useWindowWidth';

interface AdminDashboardProps {
  user?: { name: string; email: string };
  onLogout: () => void;
  onBackToStore?: () => void;
  activeModule?: 'dashboard' | 'billing' | 'finance' | 'inventory';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  onBackToStore,
  activeModule = 'billing',
}) => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'billing' | 'finance' | 'inventory'>(activeModule);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const width = useWindowWidth();
  const isTabletOrMobile = width < 1024;
  const isMobileScreen = width < 768;

  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    if (mod && ['dashboard', 'billing', 'finance', 'inventory'].includes(mod)) {
      setCurrentTab(mod as any);
    }
  }, []);

  const handleTabChange = (tab: 'dashboard' | 'billing' | 'finance' | 'inventory') => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.set('module', tab);
    window.history.pushState({}, '', url.toString());
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
    { id: 'billing', label: 'Billing', icon: 'fa-solid fa-cash-register' },
    { id: 'finance', label: 'Finance / Girvi', icon: 'fa-solid fa-scale-balanced' },
    { id: 'inventory', label: 'Inventory', icon: 'fa-solid fa-boxes-stacked' },
  ];

  return (
    <div className="admin-dashboard-root" style={{ display: 'flex', minHeight: '100vh', background: '#f4f5f9', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      
      {/* 1. Backdrop Overlay for Tablet & Mobile Drawer */}
      {isTabletOrMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* 2. Tablet & Mobile Icon-Only Rail Sidebar (width: 64px) - Displays only icons by default */}
      {isTabletOrMobile && (
        <aside
          style={{
            width: '64px',
            background: '#ffffff',
            borderRight: '1px solid #eaecf0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 0.5rem',
            position: 'sticky',
            top: 0,
            height: '100vh',
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.1rem', width: '100%' }}>
            {/* Brand Logo Icon */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              title="Click to open full menu overlay"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.15rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <i className="fa-solid fa-gem"></i>
            </button>

            {/* Create New Bill (+ Icon) */}
            <button
              type="button"
              onClick={() => {
                handleTabChange('billing');
                setMobileMenuOpen(true);
              }}
              title="Create New Bill"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#ede9fe',
                color: '#4f46e5',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>

            <div style={{ width: '32px', height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

            {/* Icon-Only Navigation Buttons */}
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={`rail-${item.id}`}
                  type="button"
                  onClick={() => {
                    handleTabChange(item.id as any);
                    setMobileMenuOpen(true);
                  }}
                  title={item.label}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    border: 'none',
                    background: active ? '#ede9fe' : 'transparent',
                    color: active ? '#4f46e5' : '#64748b',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className={item.icon}></i>
                </button>
              );
            })}
          </div>

          {/* Bottom Store Icon */}
          {onBackToStore && (
            <button
              type="button"
              onClick={onBackToStore}
              title="Visit Online Store"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-store"></i>
            </button>
          )}
        </aside>
      )}

      {/* 3. Full Sidebar Panel (Sticky on PC, Fixed Overlay Drawer on Tablet & Mobile) */}
      <aside
        style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #eaecf0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem 1rem',
          position: isTabletOrMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: isTabletOrMobile ? 100 : 50,
          transform: isTabletOrMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          boxShadow: isTabletOrMobile && mobileMenuOpen ? '0 20px 40px rgba(0,0,0,0.15)' : 'none',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div>
          {/* Brand Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
                <i className="fa-solid fa-gem"></i>
              </div>
              <div>
                <h1 style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                  Jaya Bhavani
                </h1>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>JEWELLERS ADMIN</span>
              </div>
            </div>

            {/* Close button for overlay drawer */}
            {isTabletOrMobile && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer', padding: '4px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Primary Action Button (+ New Bill) */}
          <button
            onClick={() => handleTabChange('billing')}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '1.5rem',
            }}
          >
            <i className="fa-solid fa-plus"></i> Create New Bill
          </button>

          {/* Navigation Links */}
          <nav style={{ display: 'grid', gap: '0.35rem' }}>
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: active ? '#ede9fe' : 'transparent',
                    color: active ? '#4f46e5' : '#64748b',
                    fontWeight: active ? 700 : 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className={item.icon} style={{ fontSize: '1rem', width: '18px', textAlign: 'center' }}></i>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Promo Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', color: '#6366f1', marginBottom: '4px' }}>
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>
          <h4 style={{ margin: '0 0 2px 0', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>POS Mobile Sync</h4>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.7rem', color: '#64748b' }}>Live cloud connected</p>
          {onBackToStore && (
            <button
              onClick={onBackToStore}
              style={{ background: '#e2e8f0', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <i className="fa-solid fa-store"></i> Visit Online Store
            </button>
          )}
        </div>
      </aside>

      {/* 4. Right Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #eaecf0',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '440px' }}>
            {isTabletOrMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                title="Open menu drawer"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', fontSize: '1.1rem', cursor: 'pointer', color: '#0f172a' }}
              >
                <i className="fa-solid fa-bars"></i>
              </button>
            )}

            {/* Global Search Bar */}
            <div style={{ position: 'relative', width: '100%' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                placeholder="Search customers, products, invoices..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
              <i className="fa-solid fa-bell"></i>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#ede9fe', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NK'}
              </div>
              {!isMobileScreen && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{user?.name || 'Nikhil Manager'}</div>
                  <small style={{ color: '#64748b', fontSize: '0.7rem' }}>{user?.email || 'Store Executive'}</small>
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body with Compact Padding */}
        <main style={{ padding: isMobileScreen ? '1rem' : '1.25rem', flex: 1 }}>
          {currentTab === 'dashboard' && <DashboardModule globalSearch={globalSearch} />}
          {currentTab === 'billing' && <BillingModule />}
          {currentTab === 'finance' && <FinanceModule globalSearch={globalSearch} />}
          {currentTab === 'inventory' && <InventoryModule globalSearch={globalSearch} />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
