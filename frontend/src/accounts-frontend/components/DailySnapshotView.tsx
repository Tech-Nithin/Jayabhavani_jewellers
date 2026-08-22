import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/apiConfig';
import type { Language } from '../../utils/translations';

export interface DailySnapshotViewProps {
  lang?: Language;
  onSelectSnapshot?: (record: { date: string; data: any }) => void;
}

const fmtRs = (v: number | undefined) =>
  v !== undefined && v !== null
    ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';

const fmtG = (v: number | undefined) =>
  v !== undefined && v !== null ? `${Number(v).toFixed(3)}g` : '—';

// ─────────────────────────────────────────────────────────────────────────────
// Section Card Wrapper
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ title: string; icon: string; accent: string; children: React.ReactNode }> = ({
  title, icon, accent, children,
}) => (
  <div style={{
    background: '#ffffff',
    border: `1.5px solid ${accent}30`,
    borderRadius: '16px',
    padding: '1rem 1.1rem',
    marginBottom: '1rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '0.75rem', paddingBottom: '0.6rem',
      borderBottom: `1px solid ${accent}20`,
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', letterSpacing: '0.01em' }}>{title}</span>
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Row helper
// ─────────────────────────────────────────────────────────────────────────────
const Row: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({
  label, value, valueColor = '#1e293b', bold = false,
}) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 0', borderBottom: '1px dashed #f1f5f9', fontSize: '0.75rem',
  }}>
    <span style={{ color: '#64748b' }}>{label}</span>
    <span style={{ fontWeight: bold ? 800 : 600, color: valueColor }}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Metal Pill
// ─────────────────────────────────────────────────────────────────────────────
const MetalPill: React.FC<{ label: string; grams: number; color: string; bg: string }> = ({
  label, grams, color, bg,
}) => (
  <div style={{
    background: bg, border: `1px solid ${color}30`, borderRadius: '10px',
    padding: '8px 12px', flex: 1,
  }}>
    <div style={{ fontSize: '0.62rem', fontWeight: 700, color, marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 900, color }}>{Number(grams).toFixed(3)}g</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Detail View — Full screen for one snapshot date
// ─────────────────────────────────────────────────────────────────────────────
export const SnapshotDetailView: React.FC<{ data: any; date: string; onBack: () => void }> = ({ data, date, onBack }) => {
  const cash = data.cash || {};
  const metalPos = data.metal_position || {};
  const gold = metalPos.gold || {};
  const silver = metalPos.silver || {};
  const vault = data.vault || {};
  const karigar = data.karigar_register || {};
  const pledge = data.pledge_register || {};
  const orders = data.active_orders_metal || {};
  const bills = data.bills || {};
  const udhaari = data.udhaari || {};

  const dayName = date
    ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })
    : '';

  return (
    <div style={{ fontFamily: "'Inter','DM Sans',sans-serif", color: '#181310', minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Sticky Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'linear-gradient(135deg, #181310 0%, #2b2019 100%)',
        padding: '0.85rem 1rem',
        display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: '#2b2019', border: '1px solid #3d2f25', borderRadius: '10px',
            color: '#fbbf24', fontSize: '0.85rem', padding: '6px 12px',
            cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ← Back
        </button>
        <div>
          <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.95rem' }}>
            📸 Daily Snapshot — {date}
          </div>
          <div style={{ color: '#a39284', fontSize: '0.68rem', marginTop: '1px' }}>{dayName}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#a39284' }}>
          {data.generated_at ? `Generated: ${new Date(data.generated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}
        </div>
      </div>

      <div style={{ padding: '1rem', maxWidth: '960px', margin: '0 auto' }}>

        {/* ── Total Metal Position Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: '18px', padding: '1.1rem 1.2rem', marginBottom: '1rem',
          boxShadow: '0 8px 32px rgba(49,46,129,0.3)',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            🔢 Total Metal Position (All Locations)
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <div style={{ fontSize: '0.62rem', color: '#fde68a', fontWeight: 700, marginBottom: '4px' }}>🥇 Total Gold</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24' }}>{fmtG(gold.total_gold_grams)}</div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[
                  { label: 'Showcase', val: gold.showcase_grams },
                  { label: 'Scrap Vault', val: gold.vault_scrap_grams },
                  { label: 'At Karigars', val: gold.at_karigars_grams },
                  { label: 'Pledged (Girvi)', val: gold.pledged_girvi_grams },
                  { label: 'Active Orders', val: gold.active_orders_grams },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#c7d2fe' }}>
                    <span>{r.label}</span><strong style={{ color: '#fde68a' }}>{fmtG(r.val)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: '1px', background: '#4338ca', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: '140px' }}>
              <div style={{ fontSize: '0.62rem', color: '#bae6fd', fontWeight: 700, marginBottom: '4px' }}>🥈 Total Silver</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#e0f2fe' }}>{fmtG(silver.total_silver_grams)}</div>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {[
                  { label: 'Showcase', val: silver.showcase_grams },
                  { label: 'Scrap Vault', val: silver.vault_scrap_grams },
                  { label: 'At Karigars', val: silver.at_karigars_grams },
                  { label: 'Pledged (Girvi)', val: silver.pledged_girvi_grams },
                  { label: 'Active Orders', val: silver.active_orders_grams },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#bfdbfe' }}>
                    <span>{r.label}</span><strong style={{ color: '#bae6fd' }}>{fmtG(r.val)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: '1px', background: '#4338ca', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ fontSize: '0.62rem', color: '#86efac', fontWeight: 700, marginBottom: '4px' }}>💵 Cash Drawer</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4ade80' }}>{fmtRs(cash.cash_in_drawer)}</div>
              <div style={{ fontSize: '0.62rem', color: '#86efac', marginTop: '4px' }}>Opening Balance: {fmtRs(cash.cash_loaded_today)}</div>
            </div>
          </div>
        </div>

        {/* ── Bills Summary ── */}
        <SectionCard title="Bills Summary" icon="🧾" accent="#059669">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
            {[
              { label: 'Sales', count: bills.sell_count, color: '#059669', bg: '#f0fdf4' },
              { label: 'Buy-Back', count: bills.buy_count, color: '#d97706', bg: '#fffbeb' },
              { label: 'Exchange', count: bills.exchange_count, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Orders', count: bills.order_count, color: '#0284c7', bg: '#eff6ff' },
            ].map((b) => (
              <div key={b.label} style={{ background: b.bg, borderRadius: '10px', padding: '8px', textAlign: 'center', border: `1px solid ${b.color}20` }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: b.color }}>{b.count ?? 0}</div>
                <div style={{ fontSize: '0.6rem', color: b.color, fontWeight: 700 }}>{b.label}</div>
              </div>
            ))}
          </div>
          <Row label="Total Sales Amount" value={fmtRs(bills.total_sales_amount)} valueColor="#059669" bold />
          <Row label="Total Scrap Paid Out" value={fmtRs(bills.total_scrap_paid)} valueColor="#b91c1c" bold />
          <Row label="Total Bills Today" value={String(bills.total_bills_today ?? 0)} />
        </SectionCard>

        {/* ── Cash Register ── */}
        <SectionCard title="Cash Register Reconciliation" icon="💵" accent="#059669">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <MetalPill label="Cash in Drawer" grams={cash.cash_in_drawer} color="#059669" bg="#f0fdf4" />
          </div>
          <Row label="Cash Loaded (Opening)" value={fmtRs(cash.cash_loaded_today)} valueColor="#0369a1" bold />
          <Row label="Sales Cash IN ➕" value={fmtRs(cash.sales_cash_in)} valueColor="#059669" />
          <Row label="Exchange Cash IN ➕" value={fmtRs(cash.exchange_cash_in)} valueColor="#059669" />
          <Row label="Loans Repaid IN ➕" value={fmtRs(cash.loans_repaid_in)} valueColor="#059669" />
          <Row label="Worker Cash IN ➕" value={fmtRs(cash.worker_cash_in)} valueColor="#059669" />
          <Row label="Scrap Buy OUT ➖" value={fmtRs(cash.scrap_purchase_cash_out)} valueColor="#b91c1c" />
          <Row label="Loans Issued OUT ➖" value={fmtRs(cash.loans_issued_out)} valueColor="#b91c1c" />
          <Row label="Worker Wages OUT ➖" value={fmtRs(cash.worker_wages_out)} valueColor="#b91c1c" />
          <Row label="Total Transactions" value={String(cash.total_transactions ?? 0)} bold />
        </SectionCard>

        {/* ── Pledge (Girvi) Register ── */}
        <SectionCard title={`Pledge (Girvi) Register — ${pledge.total_loans ?? 0} Open Loans`} icon="🏅" accent="#d97706">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <MetalPill label="Gold Collateral" grams={pledge.gold_collateral_grams ?? 0} color="#b45309" bg="#fffbeb" />
            <MetalPill label="Silver Collateral" grams={pledge.silver_collateral_grams ?? 0} color="#475569" bg="#f8fafc" />
          </div>
          <Row label="Total Cash Outstanding" value={fmtRs(pledge.total_cash_outstanding)} valueColor="#b91c1c" bold />
          {(pledge.loans || []).length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Active Pledge Loans</div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {(pledge.loans || []).map((loan: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 8px', borderRadius: '8px', marginBottom: '3px',
                    background: i % 2 === 0 ? '#fffbeb' : '#fef9ee',
                    fontSize: '0.72rem',
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{loan.customer_name}</span>
                      {loan.customer_phone && <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.65rem' }}>{loan.customer_phone}</span>}
                      <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{loan.debt_date} · {loan.metal_type} · {fmtG(loan.item_weight_grams)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.78rem' }}>{fmtRs(loan.principal_outstanding)}</div>
                      <div style={{ fontSize: '0.58rem', color: loan.status === 'PARTIAL' ? '#d97706' : '#059669' }}>{loan.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Active Orders Metal ── */}
        <SectionCard title={`Active Orders (Work In Progress) — ${orders.total_active_orders ?? 0} Orders`} icon="📋" accent="#0284c7">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <MetalPill label="Gold in Orders" grams={orders.gold_in_orders_grams ?? 0} color="#b45309" bg="#fffbeb" />
            <MetalPill label="Silver in Orders" grams={orders.silver_in_orders_grams ?? 0} color="#475569" bg="#f8fafc" />
          </div>
          {(orders.orders || []).length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {(orders.orders || []).map((order: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: '8px', marginBottom: '3px',
                  background: i % 2 === 0 ? '#eff6ff' : '#f0f9ff',
                  fontSize: '0.72rem',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{order.customer_name}</span>
                    <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.65rem' }}>{order.item_name}</span>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{order.metal_type} · {order.assigned_worker}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.78rem' }}>{fmtG(order.gross_weight_grams)}</div>
                    <div style={{ fontSize: '0.58rem', color: '#64748b' }}>{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Karigar Register ── */}
        <SectionCard title={`Karigar / Goldsmith Register — ${(karigar.karigars || []).length} Goldsmiths`} icon="🔨" accent="#7c3aed">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <MetalPill label="Gold at Karigars" grams={karigar.total_gold_at_karigars ?? 0} color="#b45309" bg="#fffbeb" />
            <MetalPill label="Silver at Karigars" grams={karigar.total_silver_at_karigars ?? 0} color="#475569" bg="#f8fafc" />
          </div>
          {(karigar.karigars || []).map((k: any, i: number) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 8px',
              borderRadius: '8px', marginBottom: '3px',
              background: i % 2 === 0 ? '#f5f3ff' : '#faf5ff', fontSize: '0.75rem',
            }}>
              <span style={{ fontWeight: 700, color: '#4c1d95' }}>{k.worker_name}</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                {k.gold_grams_with_karigar > 0 && (
                  <span style={{ color: '#b45309', fontWeight: 700 }}>🥇 {fmtG(k.gold_grams_with_karigar)}</span>
                )}
                {k.silver_grams_with_karigar > 0 && (
                  <span style={{ color: '#475569', fontWeight: 700 }}>🥈 {fmtG(k.silver_grams_with_karigar)}</span>
                )}
                {!k.gold_grams_with_karigar && !k.silver_grams_with_karigar && (
                  <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Nil balance</span>
                )}
              </div>
            </div>
          ))}
        </SectionCard>

        {/* ── Scrap Vault ── */}
        <SectionCard title="Old Metal / Scrap Vault" icon="⚖️" accent="#d97706">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <MetalPill label="Gold Vault (Net)" grams={vault.gold_net_grams ?? 0} color="#b45309" bg="#fffbeb" />
            <MetalPill label="Gold Vault (Pure)" grams={vault.gold_pure_grams ?? 0} color="#78350f" bg="#fef3c7" />
            <MetalPill label="Silver Vault (Net)" grams={vault.silver_net_grams ?? 0} color="#475569" bg="#f8fafc" />
          </div>
          <Row label="Total Scrap Purchase Entries" value={String(vault.total_scrap_entries ?? 0)} />
          <Row label="Note" value={vault.note || 'Running total since app launch'} />
        </SectionCard>

        {/* ── Udhaari ── */}
        <SectionCard title={`Pending Udhaari — ${(udhaari.customers || []).length} Customers`} icon="⚠️" accent="#b91c1c">
          <Row label="Total Outstanding Due" value={fmtRs(udhaari.total_due)} valueColor="#b91c1c" bold />
          <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {(udhaari.customers || []).map((u: any, i: number) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', borderRadius: '8px', marginBottom: '3px',
                background: i % 2 === 0 ? '#fef2f2' : '#fff5f5', fontSize: '0.72rem',
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{u.customer_name}</span>
                  {u.customer_phone && <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.65rem' }}>{u.customer_phone}</span>}
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{u.bill_date}</div>
                </div>
                <strong style={{ color: '#b91c1c', fontSize: '0.78rem' }}>{fmtRs(u.due_amount)}</strong>
              </div>
            ))}
            {(udhaari.customers || []).length === 0 && (
              <div style={{ textAlign: 'center', color: '#86efac', fontSize: '0.75rem', padding: '1rem' }}>✅ No pending udhaari!</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Daily Snapshot Screen — History List
// ─────────────────────────────────────────────────────────────────────────────
export const DailySnapshotView: React.FC<DailySnapshotViewProps> = ({ lang = 'EN', onSelectSnapshot }) => {
  void lang;
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ date: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/inventory/closing-records`);
      const d = await res.json();
      if (d.success) setHistory(d.records || []);
      else setError('Failed to load snapshot history.');
    } catch {
      setError('Network error loading snapshots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleOpenRecord = async (recordDate: string) => {
    try {
      const res = await fetch(`${API_BASE}/inventory/closing-record/${recordDate}`);
      const d = await res.json();
      if (d.success && d.record) {
        const closingData = typeof d.record.closing_data === 'string'
          ? JSON.parse(d.record.closing_data)
          : d.record.closing_data;
        if (onSelectSnapshot) {
          onSelectSnapshot({ date: recordDate, data: closingData });
        } else {
          setSelectedRecord({ date: recordDate, data: closingData });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateToday = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/inventory/closing-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (d.success) {
        await fetchHistory();
        // Auto-open the generated record
        const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (onSelectSnapshot) {
          onSelectSnapshot({ date: todayDate, data: d.closing_record });
        } else {
          setSelectedRecord({ date: todayDate, data: d.closing_record });
        }
      } else {
        setError(d.message || 'Failed to generate snapshot.');
      }
    } catch {
      setError('Network error generating snapshot.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Detail view (full-screen) ──
  if (selectedRecord) {
    return (
      <SnapshotDetailView
        data={selectedRecord.data}
        date={selectedRecord.date}
        onBack={() => setSelectedRecord(null)}
      />
    );
  }

  // ── History list view ──
  return (
    <div style={{ fontFamily: "'Inter','DM Sans',sans-serif", color: '#181310' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📸</span>
            Daily Snapshot History
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
            End-of-day snapshots with complete cash, stock, pledge, orders &amp; karigar positions
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateToday}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '12px', border: 'none',
            background: generating ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#fff', fontWeight: 700, fontSize: '0.78rem',
            cursor: generating ? 'default' : 'pointer',
            boxShadow: generating ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {generating
            ? <><i className="fa-solid fa-spinner fa-spin" /> Generating...</>
            : <><i className="fa-solid fa-camera" /> Generate Today's Snapshot</>
          }
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.78rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#7c3aed', marginBottom: '8px' }} />
          <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>Loading snapshot history...</div>
        </div>
      )}

      {!loading && history.length === 0 && (
        <div style={{
          background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px',
          padding: '3rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📸</div>
          <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem', marginBottom: '4px' }}>No Snapshots Yet</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
            Generate your first daily closing snapshot to start tracking your shop's complete daily position.
          </div>
          <button
            type="button"
            onClick={handleGenerateToday}
            disabled={generating}
            style={{
              padding: '10px 24px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            {generating ? 'Generating...' : '📊 Generate First Snapshot'}
          </button>
        </div>
      )}

      {/* History Grid */}
      {!loading && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {history.map((record: any) => {
            const d = record.record_date;
            const savedAt = record.updated_at || record.created_at;
            const dayLabel = d ? new Date(d).toLocaleDateString('en-IN', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
            }) : '—';
            const savedLabel = savedAt ? new Date(savedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
            const isToday = d === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

            return (
              <div
                key={record.id}
                onClick={() => handleOpenRecord(d)}
                style={{
                  background: '#ffffff',
                  border: isToday ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '0.85rem 1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: isToday ? '0 4px 20px rgba(124,58,237,0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                  gap: '12px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = isToday ? '0 4px 20px rgba(124,58,237,0.12)' : '0 2px 8px rgba(0,0,0,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: isToday ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}>
                    📸
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{dayLabel}</span>
                      {isToday && (
                        <span style={{ fontSize: '0.6rem', background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>TODAY</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                      Saved at {savedLabel}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700 }}>View Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailySnapshotView;
