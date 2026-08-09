import React from 'react';
import { BillingDashboard } from './pages/BillingDashboard';

export const AppBilling: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', color: '#fff' }}>
      <BillingDashboard />
    </div>
  );
};

export default AppBilling;
