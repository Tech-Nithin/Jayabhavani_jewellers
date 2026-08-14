import React, { useState, useEffect } from 'react';
import { DashboardModule } from '../dashboard-frontend/DashboardModule';
import { BillingModule } from '../billing-frontend/BillingModule';
import { FinanceModule } from '../finance-frontend/FinanceModule';
import { InventoryModule } from '../inventory-frontend/InventoryModule';
import { WorkAssignmentModule } from '../work-assignment-frontend/WorkAssignmentModule';
import { OrdersModule } from '../orders-frontend/OrdersModule';
import { useWindowWidth } from '../utils/useWindowWidth';
import AnnouncementBar from './AnnouncementBar';
import { PwaInstallBanner } from './PwaInstallBanner';

import { translations } from '../utils/translations';
import type { Language } from '../utils/translations';

interface AdminDashboardProps {
  user?: { name: string; email: string };
  onLogout: () => void;
  onBackToStore?: () => void;
  activeModule?: 'dashboard' | 'billing' | 'orders' | 'finance' | 'inventory' | 'work-assignment';
}


export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  onBackToStore,
  activeModule = 'billing',
}) => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'billing' | 'orders' | 'finance' | 'inventory' | 'work-assignment' | 'workers'>(activeModule as any);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [lang, setLang] = useState<Language>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = (params.get('lang') || '').toUpperCase();
    if (urlLang === 'TE' || urlLang === 'EN') return urlLang as Language;
    const localLang = (localStorage.getItem('jbj_selected_lang') || '').toUpperCase();
    if (localLang === 'TE' || localLang === 'EN') return localLang as Language;
    return 'EN';
  });

  // Silence unused state check
  void setGlobalSearch;
  void onBackToStore;

  const width = useWindowWidth();
  const isTabletOrMobile = width < 1024;
  const isMobileScreen = width < 768;

  // Sync tab & language with URL and localStorage & handle popstate swipe gestures
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('module');
      if (mod && ['dashboard', 'billing', 'orders', 'finance', 'inventory', 'work-assignment', 'workers'].includes(mod)) {
        setCurrentTab(mod as any);
      }
      const urlLang = (params.get('lang') || '').toUpperCase();
      if (urlLang === 'TE' || urlLang === 'EN') {
        setLang(urlLang as Language);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('lang', lang.toLowerCase());
    localStorage.setItem('jbj_selected_lang', lang);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [lang]);

  const handleTabChange = (tab: 'dashboard' | 'billing' | 'orders' | 'finance' | 'inventory' | 'work-assignment') => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);

    // Clear previous module params & start URL cleanly with active module & lang
    const currentParams = new URLSearchParams(window.location.search);
    const currentLang = currentParams.get('lang') || lang.toLowerCase();

    const newParams = new URLSearchParams();
    newParams.set('module', tab);
    if (currentLang) {
      newParams.set('lang', currentLang);
    }

    window.history.pushState({}, '', `?${newParams.toString()}`);
  };

  const t = translations[lang];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: 'fa-solid fa-chart-pie' },
    { id: 'billing', label: t.billing, icon: 'fa-solid fa-cash-register' },
    { id: 'orders', label: lang === 'TE' ? 'ఆర్డర్లు' : 'Orders', icon: 'fa-solid fa-cart-flatbed' },
    { id: 'workers', label: t.workAssignment, icon: 'fa-solid fa-clipboard-list' },
    { id: 'finance', label: t.finance, icon: 'fa-solid fa-scale-balanced' },
    { id: 'inventory', label: t.inventory, icon: 'fa-solid fa-boxes-stacked' },
  ];

  return (
    <div className="admin-dashboard-root" style={{ display: 'flex', minHeight: '100vh', background: '#faf7f2', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>

      {/* 1. Backdrop Overlay for Tablet & Mobile Drawer */}
      {isTabletOrMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 19, 16, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 90,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* 2. Tablet & Mobile Icon-Only Rail Sidebar (width: 64px) - Matte Black Ceiling & Walnut Theme */}
      {isTabletOrMobile && (
        <aside
          style={{
            width: '64px',
            background: '#181310',
            borderRight: '1px solid #2b2019',
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
            {/* Top Brand Logo */}
            <img
              src="/JB_logo.png"
              alt="JB Logo"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                cursor: 'pointer',
              }}
            />

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
                background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.3)',
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>

            <div style={{ width: '32px', height: '1px', background: '#2b2019', margin: '2px 0' }} />

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
                    background: active ? '#2b2019' : 'transparent',
                    color: active ? '#fbbf24' : '#a39284',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    borderLeft: active ? '3px solid #d97706' : 'none',
                  }}
                >
                  <i className={item.icon}></i>
                </button>
              );
            })}
          </div>

          {/* Bottom Rail Gear Settings Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Account Settings & Logout"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid #3d2f25',
                background: settingsOpen ? '#2b2019' : '#181310',
                color: settingsOpen ? '#fbbf24' : '#a39284',
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-gear" style={{ transform: settingsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease', color: settingsOpen ? '#fbbf24' : '#d97706' }}></i>
            </button>

            {/* Rail Settings Popover Dropdown */}
            {settingsOpen && (
              <>
                <div onClick={() => setSettingsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 'calc(100% + 12px)',
                    width: '240px',
                    background: '#181310',
                    borderRadius: '14px',
                    border: '1px solid #3d2f25',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                    padding: '0.9rem',
                    zIndex: 100,
                  }}
                >
                  {/* User Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.75rem', borderBottom: '1px solid #2b2019' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#2b2019', border: '2px solid #d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fbbf24', fontSize: '0.88rem', flexShrink: 0 }}>
                      JB
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fffefb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.name || 'JB Admin'}
                      </div>
                      <small style={{ color: '#a39284', fontSize: '0.72rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.email || 'nikhil@jayabhavani.com'}
                      </small>
                    </div>
                  </div>

                  {/* PWA Download / Install Button for Admin */}
                  <PwaInstallBanner mode="menu" />

                  {/* Logout Button */}
                  <div style={{ paddingTop: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsOpen(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #7f1d1d',
                        background: '#451a1a',
                        color: '#fca5a5',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {/* 3. Full Sidebar Panel (Sticky on PC, Fixed Overlay Drawer on Tablet & Mobile) */}
      <aside
        style={{
          width: '240px',
          background: '#181310',
          borderRight: '1px solid #2b2019',
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
          boxShadow: isTabletOrMobile && mobileMenuOpen ? '0 20px 40px rgba(0,0,0,0.35)' : 'none',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div>
          {/* Brand Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/JB_logo.png"
                alt="Jaya Bhavani Jewellers Logo"
                style={{
                  width: '46px',
                  height: '46px',
                  objectFit: 'contain',
                }}
              />
              <div>
                <h1 style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.1rem', color: '#fffefb', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                  Jaya Bhavani
                </h1>
                <span style={{ fontSize: '0.68rem', color: '#c59b27', fontWeight: 700, letterSpacing: '0.5px' }}>JEWELLERS SHOWROOM</span>
              </div>
            </div>

            {/* Close button for overlay drawer */}
            {isTabletOrMobile && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a39284', fontSize: '1.1rem', cursor: 'pointer', padding: '4px' }}
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
              background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(180, 83, 9, 0.35)',
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
                    background: active ? '#2b2019' : 'transparent',
                    color: active ? '#fbbf24' : '#a39284',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    borderLeft: active ? '3px solid #d97706' : '3px solid transparent',
                  }}
                >
                  <i className={item.icon} style={{ fontSize: '1rem', width: '18px', textAlign: 'center', color: active ? '#fbbf24' : '#a39284' }}></i>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Gear Settings Control (Fixed at bottom of sidebar) */}
        <div style={{ position: 'relative', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{
              width: '100%',
              padding: '0.7rem 0.85rem',
              borderRadius: '11px',
              border: '1px solid #3d2f25',
              background: settingsOpen ? '#2b2019' : '#1f1915',
              color: settingsOpen ? '#fbbf24' : '#d4c7b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-gear" style={{ transform: settingsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease', color: '#d97706', fontSize: '0.95rem' }}></i>
              Account Settings
            </span>
            <i className={`fa-solid fa-chevron-${settingsOpen ? 'down' : 'up'}`} style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
          </button>

          {/* Settings Dropdown Popover (Appears above bottom button) */}
          {settingsOpen && (
            <>
              <div
                onClick={() => setSettingsOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  width: '100%',
                  background: '#181310',
                  borderRadius: '14px',
                  border: '1px solid #3d2f25',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                  padding: '0.9rem',
                  zIndex: 100,
                }}
              >
                {/* User Avatar, Name & Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '0.75rem', borderBottom: '1px solid #2b2019' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#2b2019', border: '2px solid #d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fbbf24', fontSize: '0.88rem', flexShrink: 0 }}>
                    JB
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fffefb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.name || 'JB Admin'}
                    </div>
                    <small style={{ color: '#a39284', fontSize: '0.72rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.email || 'nikhil@jayabhavani.com'}
                    </small>
                  </div>
                </div>

                {/* PWA Download / Install Button for Admin */}
                <PwaInstallBanner mode="menu" />

                {/* Logout Button */}
                <div style={{ paddingTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #7f1d1d',
                      background: '#451a1a',
                      color: '#fca5a5',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* 4. Right Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Global Unified Rates Header (Single Source AnnouncementBar Component) */}
        <AnnouncementBar
          mode="admin"
          user={user}
          isTabletOrMobile={isTabletOrMobile}
          isMobileScreen={isMobileScreen}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'EN' ? 'TE' : 'EN'))}
        />
        <main style={{ padding: isMobileScreen ? '0.5rem' : isTabletOrMobile ? '0.5rem 0.65rem' : '0.75rem 1rem', flex: 1 }}>
          {currentTab === 'dashboard' && <DashboardModule globalSearch={globalSearch} lang={lang} />}
          {currentTab === 'billing' && <BillingModule lang={lang} />}
          {currentTab === 'orders' && <OrdersModule lang={lang} />}
          {currentTab === 'finance' && <FinanceModule globalSearch={globalSearch} lang={lang} />}
          {currentTab === 'inventory' && <InventoryModule globalSearch={globalSearch} lang={lang} />}
          {(currentTab === 'workers' || currentTab === 'work-assignment') && <WorkAssignmentModule globalSearch={globalSearch} lang={lang} />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
