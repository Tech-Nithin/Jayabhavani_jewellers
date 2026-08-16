import React from 'react';

interface WorkerSidebarProps {
  workers: any[];
  worker: any;
  sidebarSearchQuery: string;
  setSidebarSearchQuery: (q: string) => void;
  unreadCounts: Record<string, number>;
  lastMessageTimes: Record<string, string>;
  onSelectWorker: (w: any) => void;
  filteredSidebarWorkers: any[];
}

export const WorkerSidebar: React.FC<WorkerSidebarProps> = ({
  workers,
  worker,
  sidebarSearchQuery,
  setSidebarSearchQuery,
  unreadCounts,
  lastMessageTimes,
  onSelectWorker,
  filteredSidebarWorkers,
}) => {
  return (
    <div
      style={{
        width: '200px',
        borderRight: '1px solid #cbd5e1',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Sidebar Header & Search */}
      <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set('module', 'work-assignment');
            params.set('view', 'work-history');
            params.set('workerId', 'ALL');
            window.history.pushState({}, '', `?${params.toString()}`);
            window.dispatchEvent(new Event('popstate'));
          }}
          style={{
            width: '100%',
            padding: '6px 10px',
            marginBottom: '8px',
            borderRadius: '8px',
            border: '1px solid #b45309',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
            transition: 'all 0.15s ease',
          }}
          title="Go to Worker History"
        >
          <i className="fa-solid fa-clock-rotate-left"></i> Worker History
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fa-solid fa-users" style={{ color: '#075e54', fontSize: '0.8rem' }}></i> Workers
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '8px' }}>
            {workers.length}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.70rem' }}></i>
          <input
            type="text"
            placeholder="Search..."
            value={sidebarSearchQuery}
            onChange={(e) => setSidebarSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '4px 8px 4px 24px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.72rem', outline: 'none', background: '#ffffff' }}
          />
        </div>
      </div>

      {/* Worker Contact List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
        {filteredSidebarWorkers.map((w: any) => {
          const isSelected = w.id === worker?.id;
          const unreadCount = unreadCounts[w.id] ?? w.unread_messages_count ?? 0;
          const rawLastTime = lastMessageTimes[w.id] || w.last_message_at;

          let formattedTime = '';
          if (rawLastTime) {
            const d = new Date(rawLastTime);
            if (!isNaN(d.getTime())) {
              formattedTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
          }

          return (
            <div
              key={w.id}
              onClick={() => onSelectWorker(w)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.4rem',
                padding: '0.55rem 0.75rem',
                cursor: 'pointer',
                background: isSelected ? '#e0f2fe' : unreadCount > 0 ? '#fffbeb' : 'transparent',
                borderLeft: isSelected ? '4px solid #0284c7' : unreadCount > 0 ? '4px solid #d97706' : '4px solid transparent',
                transition: 'all 0.15s ease',
              }}
              title={`Switch to ${w.name}${unreadCount > 0 ? ` (${unreadCount} unread messages)` : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                {w.photo_url ? (
                  <img
                    src={w.photo_url}
                    alt={w.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSelected
                        ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                        : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      flexShrink: 0,
                    }}
                  >
                    {w.name ? w.name.charAt(0) : '?'}
                  </div>
                )}

                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                  <div style={{ fontWeight: isSelected || unreadCount > 0 ? 800 : 700, fontSize: '0.78rem', color: isSelected ? '#0369a1' : unreadCount > 0 ? '#b45309' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: isSelected ? '#0284c7' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.specialization || 'Goldsmith'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, marginLeft: '4px' }}>
                {formattedTime && (
                  <span style={{ fontSize: '0.60rem', fontWeight: unreadCount > 0 ? 800 : 600, color: unreadCount > 0 ? '#d97706' : '#94a3b8' }}>
                    {formattedTime}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      padding: '0 5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(180, 83, 9, 0.35)',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
