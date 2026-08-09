import React from 'react';

export type ActiveModule = 'store' | 'billing' | 'finance';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule }) => {
  const menuItems: { id: ActiveModule; label: string; icon: string; badge?: string }[] = [
    { id: 'store', label: 'Jewelry Store', icon: '💎' },
    { id: 'billing', label: 'Billing Module', icon: '🧾', badge: 'billing-frontend' },
    { id: 'finance', label: 'Finance Module', icon: '📊', badge: 'finance-frontend' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: '#151521',
      borderRight: '1px solid #28283c',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '1.5rem 1rem',
      color: '#fff',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 0.5rem 1.5rem 0.5rem', borderBottom: '1px solid #28283c', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d4af37', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>👑</span> Jaya Bhavani
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>Enterprise Management</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)' : 'transparent',
                color: isActive ? '#d4af37' : '#a1a1c0',
                borderLeft: isActive ? '3px solid #d4af37' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px',
                  background: '#232334',
                  color: isActive ? '#d4af37' : '#6c757d',
                  border: '1px solid #323248',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
