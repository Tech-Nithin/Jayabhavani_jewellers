import React from 'react';

interface WorkerTransactionItem {
  id: string;
  worker_id: string;
  order_id?: string | null;
  direction: 'OUTGOING' | 'INCOMING';
  category: 'CASH' | 'GOLD' | 'SILVER' | 'ORNAMENT' | 'CHAT' | 'ORDER';
  amount_cash?: number;
  weight_grams?: number;
  touch_percentage?: number;
  fine_weight_grams?: number;
  item_name?: string;
  cash_metal_link?: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
  applied_rate_per_gram?: number;
  equivalent_metal_grams?: number;
  photos: string[];
  notes: string;
  created_at: string;
  status_state?: 'PENDING' | 'SENDING' | 'DELIVERED' | 'READ' | 'FAILED' | string;
  is_seen?: 'YES' | 'NO' | string;
  read_at?: string | null;
  seen_at?: string | null;
  is_deleted?: boolean;
  edited_at_history?: any[];
  reply_to?: {
    id: string;
    senderName: string;
    notes: string;
    photos?: string[];
  } | null;
}

interface ReplyMessageData {
  id: string;
  senderName: string;
  notes: string;
  photos?: string[];
}

interface MessageBubbleProps {
  t: WorkerTransactionItem;
  workerName: string;
  isMatched: boolean;
  isCurrentActiveMatch: boolean;
  activeMenuTxId: string | null;
  menuPosition: 'down' | 'up';
  setActiveMenuTxId: (id: string | null) => void;
  setMenuPosition: (v: 'down' | 'up') => void;
  setReplyTo: (v: ReplyMessageData | null) => void;
  setEditingTxId: (id: string | null) => void;
  setEditText: (v: string) => void;
  setHistoryTx: (tx: WorkerTransactionItem | null) => void;
  setPreviewImageData: (d: { url: string; title: string } | null) => void;
  onDeleteMessage: (id: string) => void;
  toSentenceCase: (str?: string | null) => string;
  downloadImageAsJpeg: (url: string, filename: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  t,
  workerName,
  isMatched,
  isCurrentActiveMatch,
  activeMenuTxId,
  menuPosition,
  setActiveMenuTxId,
  setMenuPosition,
  setReplyTo,
  setEditingTxId,
  setEditText,
  setHistoryTx,
  setPreviewImageData,
  onDeleteMessage,
  toSentenceCase,
  downloadImageAsJpeg,
}) => {
  const isOutgoing = t.direction === 'OUTGOING';
  const weight = Number(t.weight_grams) || 0;
  const touch = Number(t.touch_percentage) || 100.0;
  const fineGold = t.fine_weight_grams ? Number(t.fine_weight_grams) : (weight * touch / 100);

  return (
    <div
      id={`tx-bubble-${t.id}`}
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: '1rem',
      }}
    >
      <div
        className="worker-chat-bubble"
        style={{
          maxWidth: '75%',
          minWidth: '210px',
          background: isOutgoing ? '#fff7ed' : '#ffffff',
          borderRadius: isOutgoing ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '0.45rem 0.65rem',
          boxShadow: isCurrentActiveMatch ? '0 0 0 3px #d97706, 0 4px 16px rgba(217,119,6,0.3)' : isMatched ? '0 0 0 2px #0284c7' : '0 2px 5px rgba(0,0,0,0.06)',
          position: 'relative',
          border: isOutgoing ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Badge Header with Options Dropdown Trigger */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px', position: 'relative' }}>
          <span
            style={{
              fontSize: '0.60rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '8px',
              background: isOutgoing ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#0284c7',
              color: '#ffffff',
              textTransform: 'uppercase',
            }}
          >
            {isOutgoing ? 'YOU' : 'WORKER'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            {!t.is_deleted && (
              <button
                type="button"
                className="wa-menu-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeMenuTxId === t.id) {
                    setActiveMenuTxId(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    setMenuPosition(spaceBelow < 220 ? 'up' : 'down');
                    setActiveMenuTxId(t.id);
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.72rem', padding: '0 3px' }}
                title="Message options"
              >
                <i className="fa-solid fa-caret-down" />
              </button>
            )}

            {/* Dropdown Options Menu */}
            {activeMenuTxId === t.id && (
              <div
                className={`wa-bubble-dropdown ${isOutgoing ? 'wa-bubble-out' : 'wa-bubble-in'}`}
                style={{
                  top: menuPosition === 'up' ? 'auto' : '100%',
                  bottom: menuPosition === 'up' ? '100%' : 'auto',
                  right: isOutgoing ? 0 : 'auto',
                  left: isOutgoing ? 'auto' : 0,
                  marginTop: menuPosition === 'down' ? '4px' : undefined,
                  marginBottom: menuPosition === 'up' ? '4px' : undefined,
                  whiteSpace: 'nowrap',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!t.is_deleted && (
                  <button
                    type="button"
                    className="wa-dropdown-item"
                    onClick={() => {
                      setActiveMenuTxId(null);
                      setReplyTo({
                        id: t.id,
                        senderName: isOutgoing ? 'YOU' : workerName,
                        notes: t.notes || (t.category === 'CASH' ? `₹${t.amount_cash}` : `${t.weight_grams}g ${t.category}`),
                        photos: t.photos,
                      });
                    }}
                  >
                    <i className="fa-solid fa-reply" /> Reply
                  </button>
                )}

                {t.notes && !t.is_deleted && (
                  <button
                    type="button"
                    className="wa-dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(t.notes);
                      alert('📋 Message text copied to clipboard!');
                      setActiveMenuTxId(null);
                    }}
                  >
                    <i className="fa-solid fa-copy" /> Copy Text
                  </button>
                )}

                {isOutgoing && !t.is_deleted && (Date.now() - new Date(t.created_at).getTime() <= 30 * 60 * 1000) && (
                  <button
                    type="button"
                    className="wa-dropdown-item"
                    onClick={() => {
                      setActiveMenuTxId(null);
                      setEditingTxId(t.id);
                      setEditText(t.notes || '');
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square" /> Edit Message
                  </button>
                )}

                {t.edited_at_history && t.edited_at_history.length > 0 && (
                  <button
                    type="button"
                    className="wa-dropdown-item"
                    onClick={() => {
                      setActiveMenuTxId(null);
                      setHistoryTx(t);
                    }}
                  >
                    <i className="fa-solid fa-clock-rotate-left" /> View Edit History ({t.edited_at_history.length})
                  </button>
                )}

                {t.photos && t.photos.length > 0 && (
                  <button
                    type="button"
                    className="wa-dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImageAsJpeg(t.photos[0], `jbj_image_${t.id}.jpeg`);
                      setActiveMenuTxId(null);
                    }}
                  >
                    <i className="fa-solid fa-download" /> Download Image (JPEG)
                  </button>
                )}

                {isOutgoing && !t.is_deleted && (
                  <button
                    type="button"
                    className="wa-dropdown-item text-danger"
                    onClick={() => {
                      setActiveMenuTxId(null);
                      if (confirm('Delete this message for everyone?')) {
                        onDeleteMessage(t.id);
                      }
                    }}
                  >
                    <i className="fa-solid fa-trash-can" /> Delete Message
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Deleted Message Placeholder vs Normal Message */}
        {t.is_deleted ? (
          <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.78rem', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-ban" style={{ color: '#94a3b8' }} /> This message was deleted
          </div>
        ) : (
          <>
            {/* Quoted Message Reply Display inside Bubble */}
            {t.reply_to && (
              <div style={{ background: 'rgba(0,0,0,0.04)', borderLeft: '3px solid #0284c7', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', fontSize: '0.72rem' }}>
                <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.65rem' }}>Replying to {t.reply_to.senderName}</div>
                <div style={{ color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.reply_to.notes}</div>
              </div>
            )}

            {/* Transaction Category & Detailed Breakdown */}
            {t.photos && t.photos.length > 0 && Number(t.amount_cash) === 0 && Number(t.weight_grams) === 0 ? (
              <div style={{ margin: '4px 0', padding: '5px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.62rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i> PHOTO ATTACHMENT
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 2px 0' }}>
                  {toSentenceCase(t.item_name || 'Photo Attachment')}
                </div>
              </div>
            ) : t.category === 'CASH' ? (
              <div style={{ margin: '4px 0', padding: '5px 8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.62rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>💵 CASH {t.cash_metal_link === 'FOR_GOLD' ? 'FOR GOLD' : t.cash_metal_link === 'FOR_SILVER' ? 'FOR SILVER' : 'PAYMENT'}</span>
                  {t.cash_metal_link && (
                    <span style={{ fontSize: '0.58rem', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px', color: '#15803d' }}>
                      {t.cash_metal_link === 'FOR_GOLD' ? '🥇 Raw Gold' : t.cash_metal_link === 'FOR_SILVER' ? '🥈 Raw Silver' : '💵 General'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d', marginTop: '1px' }}>
                  💵 ₹{t.amount_cash?.toLocaleString('en-IN') || '0'}
                </div>
                {t.item_name && (
                  <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                    For {toSentenceCase(t.item_name)}
                  </div>
                )}
                {t.applied_rate_per_gram && t.applied_rate_per_gram > 0 ? (
                  <div style={{ marginTop: '3px', fontSize: '0.66rem', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Rate:</strong> ₹{t.applied_rate_per_gram.toLocaleString('en-IN')}/g</span>
                    <span style={{ color: '#15803d', fontWeight: 800 }}>
                      <strong>Eq. Pure:</strong> {(Number(t.amount_cash) / Number(t.applied_rate_per_gram)).toFixed(3)} g
                    </span>
                  </div>
                ) : null}
              </div>
            ) : Number(t.weight_grams) > 0 ? (
              <div style={{ margin: '4px 0', padding: '5px 8px', background: t.category === 'GOLD' ? '#fffbe8' : t.category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '8px', border: t.category === 'GOLD' ? '1px solid #fde68a' : t.category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{t.category === 'GOLD' ? '🥇 Raw Gold' : t.category === 'SILVER' ? '🥈 Raw Silver' : '👑 Ornament'}</span>
                  </div>
                  {t.item_name && (
                    <div style={{ fontSize: '0.72rem', color: t.category === 'GOLD' ? '#b45309' : '#0369a1', fontWeight: 700, marginTop: '1px' }}>
                      For {toSentenceCase(t.item_name)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.70rem', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>GROSS WT</span>
                    <strong style={{ color: '#0f172a' }}>{weight.toFixed(3)} g</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>TOUNCH</span>
                    <strong style={{ color: t.category === 'GOLD' ? '#b45309' : t.category === 'SILVER' ? '#475569' : '#0369a1' }}>{touch}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>100% PURE</span>
                    <strong style={{ color: '#15803d' }}>{fineGold.toFixed(3)} g</strong>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Notes / Plain Text Message */}
            {t.notes && (
              Number(t.weight_grams) > 0 ? (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.70rem', color: '#334155', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '3px 6px', borderRadius: '4px' }}>
                  "{t.notes}"
                </p>
              ) : (
                <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                  {t.notes}
                </div>
              )
            )}

            {/* Photo Thumbnails with Full-Screen Expand & Share */}
            {t.photos && t.photos.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {t.photos.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={url}
                      alt="Transaction Photo"
                      style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                      onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                      title="Click to view full screen & share"
                    />
                    <span
                      onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                      style={{ position: 'absolute', bottom: '3px', right: '3px', background: 'rgba(0,0,0,0.65)', color: '#ffffff', fontSize: '0.62rem', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-expand"></i>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Message Footer: Timestamp, Edit Badge, Status Ticks at Bottom Right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '0.60rem', color: '#64748b' }}>
          {t.edited_at_history && t.edited_at_history.length > 0 && !t.is_deleted && (
            <span
              style={{ fontStyle: 'italic', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => setHistoryTx(t)}
              title="Click to view edit history"
            >
              (edited)
            </span>
          )}
          <span>{new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          {isOutgoing && (
            <span className="wa-status-ticks" style={{ marginLeft: '2px', display: 'inline-flex', alignItems: 'center' }}>
              {t.status_state === 'FAILED' ? (
                <span className="wa-failed-badge" title="Sending failed">
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '0.70rem' }} />
                </span>
              ) : t.status_state === 'SENDING' ? (
                <i className="fa-solid fa-clock" style={{ color: '#94a3b8', fontSize: '0.70rem' }} title="Sending..." />
              ) : t.status_state === 'READ' || t.is_seen === 'YES' || t.read_at || t.seen_at ? (
                <i className="fa-solid fa-check-double" style={{ color: '#0284c7', fontSize: '0.75rem' }} title="Seen by Worker (Blue tick)" />
              ) : (
                <i className="fa-solid fa-check-double" style={{ color: '#94a3b8', fontSize: '0.75rem' }} title="Delivered to Worker" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
