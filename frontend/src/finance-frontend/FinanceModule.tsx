import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

interface FinanceDebtRecord {
  id: string;
  item_name: string;
  customer_name: string;
  customer_phone?: string;
  debt_principal: number;
  item_weight_grams: number;
  interest_rate_per_month: number;
  start_date: string;
  actual_timeline_till_date: string;
  total_interest_till_today: number;
  total_payable_till_today: number;
  status: 'OPEN' | 'CLOSED';
}

export const FinanceModule: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const [ledger, setLedger] = useState<FinanceDebtRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form for new loan
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [loanForm, setLoanForm] = useState({
    item_name: '',
    customer_name: '',
    customer_phone: '',
    debt_principal: '',
    item_weight_grams: '',
    interest_rate_per_month: '1.5',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/overview`);
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger || []);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/finance/debt/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm),
      });
      const data = await res.json();
      if (data.success) {
        setLedger([data.record, ...ledger]);
        setShowAddLoan(false);
        setLoanForm({
          item_name: '',
          customer_name: '',
          customer_phone: '',
          debt_principal: '',
          item_weight_grams: '',
          interest_rate_per_month: '1.5',
          start_date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err) {
      console.error('Failed to create loan:', err);
    }
  };

  // Filter ledger by search & date range
  const filteredLedger = ledger.filter((rec) => {
    const matchesSearch =
      rec.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.customer_phone && rec.customer_phone.includes(searchTerm)) ||
      rec.item_name.toLowerCase().includes(searchTerm.toLowerCase());

    const recDate = new Date(rec.start_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let matchesDate = true;
    if (start && recDate < start) matchesDate = false;
    if (end && recDate > end) matchesDate = false;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="admin-dashboard-root" style={{ color: '#1e293b', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Header & Controls */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: '#6366f1', marginRight: '6px' }}></i> Girvi / Pledge Loan Interest Ledger
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            Customer debt records, monthly interest rate %, timeline, and total interest accrued till today
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Date Range Filters */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: '#ffffff', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid #eaecf0' }}>
            <i className="fa-solid fa-calendar-days" style={{ color: '#6366f1', fontSize: '0.8rem' }}></i>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem', fontSize: '0.78rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem', fontSize: '0.78rem' }}
            />
          </div>

          <button
            onClick={() => setShowAddLoan(!showAddLoan)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <i className={showAddLoan ? 'fa-solid fa-xmark' : 'fa-solid fa-plus'}></i>
            {showAddLoan ? 'Close Form' : 'Issue New Loan'}
          </button>
        </div>
      </div>

      {/* Add New Loan Form Drawer */}
      {showAddLoan && (
        <form onSubmit={handleCreateLoan} style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.25rem', border: '1px solid #6366f1', boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-pen-to-square"></i> Issue New Pledge Debt Loan
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Name</label>
              <input
                type="text"
                placeholder="Ramesh Patel"
                value={loanForm.customer_name}
                onChange={(e) => setLoanForm({ ...loanForm, customer_name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Phone</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={loanForm.customer_phone}
                onChange={(e) => setLoanForm({ ...loanForm, customer_phone: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Item Description</label>
              <input
                type="text"
                placeholder="22K Gold Chain (Pledged)"
                value={loanForm.item_name}
                onChange={(e) => setLoanForm({ ...loanForm, item_name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Pledged Item Weight (g)</label>
              <input
                type="number"
                step="0.001"
                placeholder="15.5"
                value={loanForm.item_weight_grams}
                onChange={(e) => setLoanForm({ ...loanForm, item_weight_grams: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Debt / Loan Principal (₹)</label>
              <input
                type="number"
                placeholder="50000"
                value={loanForm.debt_principal}
                onChange={(e) => setLoanForm({ ...loanForm, debt_principal: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Interest Rate (% per month)</label>
              <input
                type="number"
                step="0.1"
                value={loanForm.interest_rate_per_month}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate_per_month: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Issue Loan Record
            </button>
          </div>
        </form>
      )}

      {/* 4 Summary Cards (Compact Gaps) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>TOTAL DEBT PRINCIPAL</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              ₹{summary?.totalDebtIssued ? summary.totalDebtIssued.toLocaleString('en-IN') : '0'}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Active loan capital</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-briefcase"></i>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>INTEREST ACCRUED TILL TODAY</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', margin: '2px 0' }}>
              ₹{summary?.totalInterestEarned ? summary.totalInterestEarned.toLocaleString('en-IN') : '0'}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Live per-month interest</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-chart-line"></i>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>OPEN LOAN ACCOUNTS</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {summary?.activeOpenLoans || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Active interest monthly</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ede9fe', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-key"></i>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>CLOSED ACCOUNTS</span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {summary?.totalClosedLoans || 0}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Fully settled</span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
        </div>
      </div>

      {/* Finance Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-table-list" style={{ color: '#6366f1' }}></i> Girvi Pledge Loan Interest Ledger
        </h3>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading finance records...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eaecf0', background: '#f8fafc', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Pledged Item</th>
                  <th style={{ padding: '10px 12px' }}>Customer Name</th>
                  <th style={{ padding: '10px 12px' }}>Debt Principal</th>
                  <th style={{ padding: '10px 12px' }}>Item Weight</th>
                  <th style={{ padding: '10px 12px' }}>Interest (%/Mo)</th>
                  <th style={{ padding: '10px 12px' }}>Start Timeline</th>
                  <th style={{ padding: '10px 12px' }}>Actual Timeline Till Date</th>
                  <th style={{ padding: '10px 12px' }}>Total Interest Till Today</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{rec.item_name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.customer_name}</div>
                      <small style={{ color: '#64748b' }}>{rec.customer_phone}</small>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b45309' }}>₹{rec.debt_principal.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>{rec.item_weight_grams}g</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#4f46e5' }}>{rec.interest_rate_per_month}% / mo</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{rec.start_date}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{rec.actual_timeline_till_date}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>₹{rec.total_interest_till_today.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: rec.status === 'OPEN' ? '#fef3c7' : '#f1f5f9',
                        color: rec.status === 'OPEN' ? '#b45309' : '#475569',
                      }}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceModule;
