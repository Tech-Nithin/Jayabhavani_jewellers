import React from 'react';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';

interface MetalCategorySelectorProps {
  activeMetal: 'GOLD' | 'SILVER' | 'CASH';
  onSelectMetal: (metal: 'GOLD' | 'SILVER' | 'CASH') => void;
  goldCount: number;
  silverCount: number;
  cashBalance?: number;
  lang?: Language;
}

export const MetalCategorySelector: React.FC<MetalCategorySelectorProps> = ({
  activeMetal,
  onSelectMetal,
  goldCount,
  silverCount,
  cashBalance = 0,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* 🥇 Gold Category Card Tab */}
        <div
          onClick={() => onSelectMetal('GOLD')}
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            cursor: 'pointer',
            background: activeMetal === 'GOLD' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : '#ffffff',
            border: activeMetal === 'GOLD' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            boxShadow: activeMetal === 'GOLD' ? '0 10px 25px -5px rgba(245, 158, 11, 0.25)' : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: activeMetal === 'GOLD' ? '#f59e0b' : '#fef3c7',
                color: activeMetal === 'GOLD' ? '#ffffff' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
              }}
            >
              🥇
            </div>
            <div>
              <div className="metal-selector-card-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                {t.goldCategoryTab}
              </div>
              <div className="metal-selector-card-sub" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                {goldCount} {goldCount === 1 ? t.productItemCount : t.productItemsCount}
              </div>
            </div>
          </div>

          <div
            className="metal-selector-badge"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: activeMetal === 'GOLD' ? '#d97706' : '#f1f5f9',
              color: activeMetal === 'GOLD' ? '#ffffff' : '#64748b',
              border: activeMetal === 'GOLD' ? 'none' : '1px solid #cbd5e1',
            }}
          >
            {activeMetal === 'GOLD' ? t.activeBadge : t.selectBadge}
          </div>
        </div>

        {/* 🥈 Silver Category Card Tab */}
        <div
          onClick={() => onSelectMetal('SILVER')}
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            cursor: 'pointer',
            background: activeMetal === 'SILVER' ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff',
            border: activeMetal === 'SILVER' ? '2px solid #0284c7' : '1px solid #e2e8f0',
            boxShadow: activeMetal === 'SILVER' ? '0 10px 25px -5px rgba(2, 132, 199, 0.25)' : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: activeMetal === 'SILVER' ? '#0284c7' : '#e0f2fe',
                color: activeMetal === 'SILVER' ? '#ffffff' : '#0369a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.2)',
              }}
            >
              🥈
            </div>
            <div>
              <div className="metal-selector-card-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                {t.silverCategoryTab}
              </div>
              <div className="metal-selector-card-sub" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                {silverCount} {silverCount === 1 ? t.productItemCount : t.productItemsCount}
              </div>
            </div>
          </div>

          <div
            className="metal-selector-badge"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: activeMetal === 'SILVER' ? '#0284c7' : '#f1f5f9',
              color: activeMetal === 'SILVER' ? '#ffffff' : '#64748b',
              border: activeMetal === 'SILVER' ? 'none' : '1px solid #cbd5e1',
            }}
          >
            {activeMetal === 'SILVER' ? t.activeBadge : t.selectBadge}
          </div>
        </div>

        {/* 💵 Cash in Hand Card Tab */}
        <div
          onClick={() => onSelectMetal('CASH')}
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            cursor: 'pointer',
            background: activeMetal === 'CASH' ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#ffffff',
            border: activeMetal === 'CASH' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            boxShadow: activeMetal === 'CASH' ? '0 10px 25px -5px rgba(22, 163, 74, 0.25)' : '0 4px 12px rgba(0,0,0,0.03)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: activeMetal === 'CASH' ? '#16a34a' : '#dcfce7',
                color: activeMetal === 'CASH' ? '#ffffff' : '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.2)',
              }}
            >
              💵
            </div>
            <div>
              <div className="metal-selector-card-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>
                {lang === 'TE' ? 'లభ్య నగదు (Cash)' : 'Cash in Hand'}
              </div>
              <div className="metal-selector-card-sub" style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 800, marginTop: '2px' }}>
                ₹{cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div
            className="metal-selector-badge"
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: activeMetal === 'CASH' ? '#16a34a' : '#f1f5f9',
              color: activeMetal === 'CASH' ? '#ffffff' : '#64748b',
              border: activeMetal === 'CASH' ? 'none' : '1px solid #cbd5e1',
            }}
          >
            {activeMetal === 'CASH' ? t.activeBadge : t.selectBadge}
          </div>
        </div>
      </div>
    </div>
  );
};
