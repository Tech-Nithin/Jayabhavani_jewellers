import React from 'react';
import { WorkerProfile, WorkerTransaction } from '../../types/worker';

interface Props {
  worker: WorkerProfile;
  transactions: WorkerTransaction[];
  pendingOrdersCount: number;
  completedOrdersCount: number;
  onOpenChat: () => void;
  onOpenOrders: () => void;
  onOpenTransactions: () => void;
}

export const WhatsAppListView: React.FC<Props> = ({
  worker,
  transactions,
  pendingOrdersCount,
  completedOrdersCount,
  onOpenChat,
  onOpenOrders,
  onOpenTransactions,
}) => {
  // Calculate latest transaction message for preview
  const lastTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;

  const getLastMessagePreview = () => {
    if (!lastTx) return 'Tap to start conversation with store admin';
    if (lastTx.notes && !lastTx.weight_grams && !lastTx.amount_cash) {
      return lastTx.notes;
    }
    if (lastTx.category === 'CASH') {
      return `💵 Cash: ₹${lastTx.amount_cash?.toLocaleString('en-IN') || 0} ${lastTx.item_name ? `· For ${lastTx.item_name}` : ''}`;
    }
    if (lastTx.category === 'GOLD') {
      return `🥇 Gold: ${lastTx.weight_grams || 0}g ${lastTx.item_name ? `· For ${lastTx.item_name}` : ''}`;
    }
    if (lastTx.category === 'SILVER') {
      return `🥈 Silver: ${lastTx.weight_grams || 0}g ${lastTx.item_name ? `· For ${lastTx.item_name}` : ''}`;
    }
    return lastTx.notes || 'Transaction entry';
  };

  const getLastMessageTime = () => {
    if (!lastTx || !lastTx.created_at) return '';
    try {
      const d = new Date(lastTx.created_at);
      const isToday = new Date().toDateString() === d.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Calculate Net Balances for summary
  let netGoldPure = 0;
  let netSilverPure = 0;
  let netCash = 0;

  for (const t of transactions) {
    if (t.is_deleted) continue;
    const isOut = t.direction === 'OUTGOING'; // Store sent to worker (+ liability for worker)
    const factor = isOut ? 1 : -1;

    if (t.category === 'GOLD' && t.weight_grams) {
      const pure = (Number(t.weight_grams) * (Number(t.touch_percentage) || 100)) / 100;
      netGoldPure += pure * factor;
    } else if (t.category === 'SILVER' && t.weight_grams) {
      const pure = (Number(t.weight_grams) * (Number(t.touch_percentage) || 100)) / 100;
      netSilverPure += pure * factor;
    } else if (t.category === 'CASH' && t.amount_cash) {
      netCash += Number(t.amount_cash) * factor;
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto', fontSize: '0.75rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
          color: '#ffffff',
          padding: '10px 14px',
          boxShadow: '0 2px 8px rgba(7, 94, 84, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.60rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
              Craftsman Portal
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, marginTop: '1px' }}>
              Welcome, {worker.name} 💎
            </div>
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#075e54',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            {worker.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Quick Balance Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', padding: '8px 12px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ background: '#fffbe8', padding: '6px 8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#92400e', display: 'block' }}>🥇 GOLD BAL</span>
          <strong style={{ fontSize: '0.72rem', color: '#b45309' }}>{netGoldPure.toFixed(3)} g</strong>
        </div>

        <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#475569', display: 'block' }}>🥈 SILVER BAL</span>
          <strong style={{ fontSize: '0.72rem', color: '#334155' }}>{netSilverPure.toFixed(3)} g</strong>
        </div>

        <div style={{ background: '#f0fdf4', padding: '6px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#166534', display: 'block' }}>💵 CASH BAL</span>
          <strong style={{ fontSize: '0.72rem', color: '#15803d' }}>₹{netCash.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Main WhatsApp-Style List Channels */}
      <div style={{ flex: 1, padding: '6px 0' }}>
        <div style={{ padding: '4px 14px 6px 14px', fontSize: '0.58rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Work Channels & Modules
        </div>

        {/* 1. JBJ - Admin Chat */}
        <div
          onClick={onOpenChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.05rem',
              boxShadow: '0 2px 6px rgba(7, 94, 84, 0.20)',
              flexShrink: 0,
            }}
          >
            👑
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                JBJ - Admin
              </div>
              <div style={{ fontSize: '0.60rem', color: '#10b981', fontWeight: 700 }}>
                {getLastMessageTime() || 'Active'}
              </div>
            </div>

            <div
              style={{
                fontSize: '0.66rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 500,
              }}
            >
              {getLastMessagePreview()}
            </div>
          </div>

          <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.70rem' }} />
        </div>

        {/* 2. My Orders (Tasks & Assignments) */}
        <div
          onClick={onOpenOrders}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.05rem',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.20)',
              flexShrink: 0,
            }}
          >
            📦
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                My Orders (Assigned Tasks)
              </div>
              <span
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '6px',
                  background: pendingOrdersCount > 0 ? '#fef3c7' : '#f1f5f9',
                  color: pendingOrdersCount > 0 ? '#b45309' : '#64748b',
                  border: pendingOrdersCount > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
                }}
              >
                {pendingOrdersCount} Pending
              </span>
            </div>

            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>
              {pendingOrdersCount} Pending Tasks · {completedOrdersCount} Completed Orders
            </div>
          </div>

          <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.70rem' }} />
        </div>

        {/* 3. Transactions & Ledger Statement */}
        <div
          onClick={onOpenTransactions}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.05rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.20)',
              flexShrink: 0,
            }}
          >
            📊
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                Transactions (Ledger Statement)
              </div>
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '1px 5px', borderRadius: '4px' }}>
                Live Log
              </span>
            </div>

            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>
              All Gold, Silver & Cash records ({transactions.filter((t) => !t.is_deleted && (((t.category === 'GOLD' || t.category === 'SILVER') && Number(t.weight_grams) > 0) || (t.category === 'CASH' && Number(t.amount_cash) > 0))).length} Total)
            </div>
          </div>

          <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.70rem' }} />
        </div>
      </div>
    </div>
  );
};
