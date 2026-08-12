import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';
import type { Language } from '../utils/translations';
import { SellingDetailsTable } from './SellingDetailsTable';
import { AssignTaskModal } from './AssignTaskModal';

const LOCAL_TRANSLATIONS = {
  EN: {
    title: 'Work Assignment & Crafting Management',
    subtitle: 'Assign gold/silver crafting, repairs, and custom jewelry orders to artisans',
    searchPlaceholder: 'Search customer name, product, or metal category...',
    kpiTotal: 'Total Sales',
    kpiGold: 'Gold Sold Weight',
    kpiSilver: 'Silver Sold Weight',
    kpiRevenue: 'Total Revenue',
  },
  TE: {
    title: 'పని కేటాయింపు & తయారీ నిర్వహణ',
    subtitle: 'బంగారం/వెండి తయారీ, మరమ్మతులు మరియు అనుకూల ఆభరణాల ఆర్డర్లను కళాకారులకు కేటాయించండి',
    searchPlaceholder: 'కస్టమర్ పేరు, ఉత్పత్తి లేదా మెటల్ కేటగిరీ కోసం వెతకండి...',
    kpiTotal: 'మొత్తం అమ్మకాలు',
    kpiGold: 'బంగారం బరువు',
    kpiSilver: 'వెండి బరువు',
    kpiRevenue: 'మొత్తం ఆదాయం',
  }
};

export const WorkAssignmentModule: React.FC<{ globalSearch?: string; lang?: Language }> = ({
  globalSearch = '',
  lang = 'EN'
}) => {
  const t = LOCAL_TRANSLATIONS[lang] || LOCAL_TRANSLATIONS.EN;
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAssignClick = (inv: any) => {
    setSelectedInvoice(inv);
    setModalOpen(true);
  };

  const handleAssignSubmit = async (formData: {
    workerName: string;
    itemWeight: number;
    itemPurity: number;
    mode: 'METAL' | 'CASH';
    invoiceId?: string | number;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const resData = await res.json();
      if (resData.success) {
        alert(`Successfully assigned task to ${formData.workerName} in ${formData.mode} mode!`);
      } else {
        alert('Failed to assign task: ' + resData.message);
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      alert('Network or server error assigning task.');
    }
  };

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/invoices`);
        const data = await res.json();
        if (data.success && Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        }
      } catch (err) {
        console.error('Failed to fetch invoices for Work Assignment Module:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  // Filter invoices to only include transaction_type === 'SELL'
  const sellInvoices = invoices.filter(
    (inv) => (inv.transaction_type || inv.receipt_json_data?.transaction_type || 'SELL').toUpperCase() === 'SELL'
  );

  // Compute dynamic stats
  const totalSalesCount = sellInvoices.length;
  
  let goldWeight = 0;
  let silverWeight = 0;
  let totalRevenue = 0;

  sellInvoices.forEach((inv) => {
    totalRevenue += Number(inv.final_amount) || 0;

    const items: any[] = inv.receipt_json_data?.items || [];
    const sellItems = items.filter((i) => (i.item_type || 'SELL').toUpperCase() === 'SELL');

    if (sellItems.length > 0) {
      sellItems.forEach((item) => {
        const w = Number(item.weight_grams) || 0;
        const metal = (item.metal_type || 'GOLD').toUpperCase();
        if (metal === 'GOLD') {
          goldWeight += w;
        } else if (metal === 'SILVER') {
          silverWeight += w;
        }
      });
    } else {
      const w = Number(inv.weight_grams) || 0;
      const metal = (inv.metal_type || 'GOLD').toUpperCase();
      if (metal === 'GOLD') {
        goldWeight += w;
      } else if (metal === 'SILVER') {
        silverWeight += w;
      }
    }
  });

  return (
    <div style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Header section */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-clipboard-list" style={{ color: '#d97706', marginRight: '8px' }}></i>
            {t.title}
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
            {t.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '380px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Card 1: Total Sales */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.kpiTotal}</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-basket-shopping"></i>
            </div>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
            {loading ? '...' : totalSalesCount}
          </h3>
        </div>

        {/* Card 2: Gold Weight */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.kpiGold}</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-weight-hanging" style={{ color: '#d97706' }}></i>
            </div>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
            {loading ? '...' : `${goldWeight.toFixed(1)} g`}
          </h3>
        </div>

        {/* Card 3: Silver Weight */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.kpiSilver}</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
            {loading ? '...' : `${silverWeight.toFixed(1)} g`}
          </h3>
        </div>

        {/* Card 4: Total Revenue */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.kpiRevenue}</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#d1fae5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-indian-rupee-sign"></i>
            </div>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
            {loading ? '...' : `₹${totalRevenue.toLocaleString('en-IN')}`}
          </h3>
        </div>
      </div>

      {/* Selling Details Table Component */}
      <SellingDetailsTable invoices={sellInvoices} loading={loading} searchTerm={searchTerm} onAssignClick={handleAssignClick} />

      {/* Assign Work Crafting Modal Dialog */}
      <AssignTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={
          selectedInvoice
            ? {
                weight: Number(selectedInvoice.weight_grams) || 0,
                purity: Number(selectedInvoice.purity_percentage) || 91.6,
                invoiceId: selectedInvoice.id,
              }
            : null
        }
        onSubmit={handleAssignSubmit}
      />
    </div>
  );
};
