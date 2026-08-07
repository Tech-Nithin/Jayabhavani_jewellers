import { useState, useEffect } from 'react';
import { allProducts, collections } from '../data/products';
import { DashboardModule } from '../dashboard-frontend';
import { BillingModule } from '../billing-frontend/BillingModule';
import { FinanceModule } from '../finance-frontend/FinanceModule';
import { InventoryModule } from '../inventory-frontend';
import { useWindowWidth } from '../utils/useWindowWidth';

interface AdminDashboardProps {
  user: { name: string; email: string };
  onLogout: () => void;
  onBackToStore?: () => void;
}

type TabType = 'dashboard' | 'billing' | 'finance' | 'inventory';

const STORAGE_KEY_TAB = 'jbj_active_tab';

/** Font Awesome icon class, label, and id for each module */
const TABS: { id: TabType; label: string; faIcon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', faIcon: 'fa-solid fa-gauge-high' },
  { id: 'billing',   label: 'Billing',   faIcon: 'fa-solid fa-file-invoice-dollar' },
  { id: 'finance',   label: 'Finance',   faIcon: 'fa-solid fa-chart-line' },
  { id: 'inventory', label: 'Inventory', faIcon: 'fa-solid fa-boxes-stacked' },
];

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const width    = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  // Sidebar toggle state (defaults to open on desktop/tablet, closed on mobile)
  const [sidebarOpen, setSidebarOpen] = useState(() => width >= 768);

  // Sync sidebar defaults when screen size changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Initialize active tab from URL or localStorage
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const params   = new URLSearchParams(window.location.search);
      const urlTab   = params.get('tab') as TabType;
      const valid: TabType[] = ['dashboard', 'billing', 'finance', 'inventory'];
      if (urlTab && valid.includes(urlTab)) return urlTab;
      const saved = localStorage.getItem(STORAGE_KEY_TAB) as TabType;
      if (saved && valid.includes(saved)) return saved;
    } catch { /* noop */ }
    return 'dashboard';
  });

  const [productList] = useState(allProducts);

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    if (isMobile) {
      setSidebarOpen(false); // close overlay sidebar on mobile after selection
    }
    localStorage.setItem(STORAGE_KEY_TAB, newTab);
    window.history.replaceState(null, '', `?view=admin&tab=${newTab}`);
  };

  useEffect(() => {
    window.history.replaceState(null, '', `?view=admin&tab=${activeTab}`);
  }, [activeTab]);

  const showFullNav = (sidebarOpen && !isTablet) || isMobile;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Top Admin Navigation Header ── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 350,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Left side: Hamburger button (Mobile only) + Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {isMobile && (
            <button
              id="admin-hamburger"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle sidebar navigation"
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <i className={sidebarOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
            </button>
          )}

          <img src="/JB_logo.png" alt="Jaya Bhavani Jewellers" style={{ height: '28px', width: 'auto', flexShrink: 0 }} />
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: isMobile ? '1.05rem' : '1.35rem',
            margin: 0,
            color: '#0f172a',
            fontWeight: 700,
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
          }}>
            JAYA BHAVANI JEWELLERS
          </h1>
        </div>

        {/* Right side controls: Desktop / Tablet Logout button */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
                transition: 'all 0.2s',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* ── Mobile Semi-Transparent Backdrop Overlay ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '53px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 290,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* ── Main Layout Body ── */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 53px)', position: 'relative' }}>

        {/* ── Sidebar Navigation (Fixed Overlay on Mobile, Inline Docked on Desktop/Tablet) ── */}
        {(sidebarOpen || !isMobile) && (
          <aside style={{
            position: isMobile ? 'fixed' : 'static',
            top: isMobile ? '53px' : undefined,
            left: isMobile ? 0 : undefined,
            bottom: isMobile ? 0 : undefined,
            zIndex: isMobile ? 300 : 'auto',
            width: isMobile ? '250px' : isTablet ? '64px' : '220px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            padding: isTablet ? '1.5rem 0.5rem' : '1.5rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0,
            overflowY: 'auto',
            boxShadow: isMobile ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
            transition: 'transform 0.25s ease, width 0.25s ease',
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={tab.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: showFullNav ? '12px' : '0',
                    justifyContent: showFullNav ? 'flex-start' : 'center',
                    padding: isTablet ? '12px' : '12px 14px',
                    borderRadius: '8px',
                    background: isActive ? '#fffbeb' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '4px solid #d97706' : '4px solid transparent',
                    color: isActive ? '#b45309' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.2s',
                    width: '100%',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i
                    className={tab.faIcon}
                    style={{
                      width: '18px',
                      textAlign: 'center',
                      fontSize: isTablet ? '1.1rem' : '0.95rem',
                      flexShrink: 0,
                    }}
                  />
                  {showFullNav && <span style={{ flex: 1 }}>{tab.label}</span>}
                  {showFullNav && isActive && (
                    <i className="fa-solid fa-circle-dot" style={{ fontSize: '0.55rem', color: '#d97706' }} />
                  )}
                </button>
              );
            })}

            {/* Mobile Logout Button inside Overlay Sidebar */}
            {isMobile && (
              <>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '12px 0 6px 0' }} />
                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket" style={{ width: '18px', textAlign: 'center', fontSize: '0.95rem' }} />
                  <span>Logout</span>
                </button>
              </>
            )}
          </aside>
        )}

        {/* ── Main Content Area ── */}
        <main style={{
          flex: 1,
          padding: isMobile ? '1rem' : isTablet ? '1.5rem' : '2rem 2.5rem',
          background: '#f8fafc',
          overflowX: 'hidden',
        }}>
          {activeTab === 'dashboard' && (
            <DashboardModule user={user} productList={productList} collectionsList={collections} />
          )}
          {activeTab === 'billing'   && <BillingModule />}
          {activeTab === 'finance'   && <FinanceModule />}
          {activeTab === 'inventory' && <InventoryModule productList={productList} />}
        </main>
      </div>
    </div>
  );
}
