import React from 'react';
import { FinanceDashboard } from './pages/FinanceDashboard';

export const AppFinance: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', color: '#fff' }}>
      <FinanceDashboard />
    </div>
  );
};

export default AppFinance;
