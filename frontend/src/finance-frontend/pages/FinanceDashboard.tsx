import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../config/apiConfig';
import { getFinanceTranslation, type Language } from '../financeTranslations';

interface FinanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  currency: string;
}

export const FinanceDashboard: React.FC<{ lang?: Language }> = ({ lang = 'EN' }) => {
  const t = getFinanceTranslation(lang);
  const [data, setData] = useState<{ summary: FinanceSummary; monthlyReports: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanceOverview();
  }, []);

  const fetchFinanceOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/overview`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch finance overview:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#4facfe', marginBottom: '0.5rem' }}>📊 {t.financeScreenTitle}</h1>
        <p style={{ color: '#a1a1c0', margin: 0 }}>
          Dedicated Finance workspace for revenue analysis, expense management, and profit tracking.
        </p>
      </header>

      {loading ? (
        <p style={{ color: '#a1a1c0' }}>Loading finance statistics...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1c0' }}>Total Revenue</span>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#4caf50' }}>
                ₹{data?.summary.totalRevenue.toLocaleString('en-IN')}
              </h2>
            </div>

            <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1c0' }}>Total Expenses</span>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#ff5252' }}>
                ₹{data?.summary.totalExpenses.toLocaleString('en-IN')}
              </h2>
            </div>

            <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40' }}>
              <span style={{ fontSize: '0.85rem', color: '#a1a1c0' }}>Net Profit</span>
              <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#4facfe' }}>
                ₹{data?.summary.netProfit.toLocaleString('en-IN')}
              </h2>
            </div>
          </div>

          <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#4facfe' }}>📈 Monthly Financial Breakdown</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #323248', color: '#a1a1c0' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Month</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Revenue</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Expenses</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {data?.monthlyReports.map((report, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #28283c' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{report.month}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#4caf50' }}>₹{report.revenue.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#ff5252' }}>₹{report.expenses.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#4facfe', fontWeight: 'bold' }}>
                      ₹{(report.revenue - report.expenses).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
