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
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
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
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
}) => {
  return (
    <div
      className="worker-sidebar-panel"
      style={{
        width: isSidebarCollapsed ? '60px' : '200px',
        borderRight: '1px solid #cbd5e1',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
      }}
    >
      {/* Sidebar Header & Toggle */}
      <div style={{ padding: isSidebarCollapsed ? '0.4rem 0.2rem' : '0.45rem 0.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'center' }}>
        {setIsSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            style={{
              width: '100%',
              padding: '3px 5px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#075e54',
              fontWeight: 800,
              fontSize: '0.68rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px',
            }}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <i className={`fa-solid fa-chevron-${isSidebarCollapsed ? 'right' : 'left'}`}></i>
            {!isSidebarCollapsed && <span style={{ marginLeft: '4px', fontSize: '0.65rem' }}>Collapse</span>}
          </button>
        )}

        {!isSidebarCollapsed && (
          <>
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
                padding: '4px 8px',
                marginBottom: '5px',
                borderRadius: '6px',
                border: '1px solid #b45309',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 1px 4px rgba(180, 83, 9, 0.2)',
                transition: 'all 0.15s ease',
              }}
              title="Go to Worker History"
            >
              <i className="fa-solid fa-clock-rotate-left"></i> Worker History
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-users" style={{ color: '#075e54', fontSize: '0.75rem' }}></i> Workers
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 5px', borderRadius: '6px' }}>
                {workers.length}
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '3px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.68rem', outline: 'none', background: '#ffffff' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Worker Contact List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isSidebarCollapsed ? '0.35rem 0' : '0.25rem 0' }}>
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

          if (isSidebarCollapsed) {
            return (
              <div
                key={w.id}
                onClick={() => onSelectWorker(w)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  cursor: 'pointer',
                  position: 'relative',
                  background: isSelected ? '#e0f2fe' : 'transparent',
                  borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                }}
                title={`${w.name} (${w.specialization || 'Goldsmith'})${unreadCount > 0 ? ` - ${unreadCount} unread` : ''}`}
              >
                <div style={{ position: 'relative' }}>
                  {w.photo_url ? (
                    <img
                      src={w.photo_url}
                      alt={w.name}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: isSelected
                          ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      {w.name ? w.name.charAt(0) : '?'}
                    </div>
                  )}

                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        background: '#d97706',
                        color: '#fff',
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        borderRadius: '50%',
                        padding: '2px 4px',
                        border: '1.5px solid #fff',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
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
