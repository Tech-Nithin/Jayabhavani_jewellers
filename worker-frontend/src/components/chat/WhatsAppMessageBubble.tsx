import React, { useState, useEffect } from 'react';
import { WorkerTransaction, ReplyMessageData } from '../../types/worker';
import { downloadImageAsJpeg } from '../../utils/imageUtils';

interface Props {
  transaction: WorkerTransaction;
  isWorkerSent: boolean;
  onReply: (replyData: ReplyMessageData) => void;
  onEdit: (tx: WorkerTransaction) => void;
  onDelete: (txId: string) => void;
  onViewEditHistory: (tx: WorkerTransaction) => void;
  onPreviewImage: (url: string) => void;
}

export const WhatsAppMessageBubble: React.FC<Props> = ({
  transaction,
  isWorkerSent,
  onReply,
  onEdit,
  onDelete,
  onViewEditHistory,
  onPreviewImage,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Close active dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const formattedTime = transaction.created_at
    ? new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const isDeleted = Boolean(transaction.is_deleted);
  const editHistory = Array.isArray(transaction.edited_at_history) ? transaction.edited_at_history : [];
  const isEdited = editHistory.length > 0;
  const isWithin30Mins = transaction.created_at
    ? Date.now() - new Date(transaction.created_at).getTime() <= 30 * 60 * 1000
    : false;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (transaction.notes) {
      navigator.clipboard.writeText(transaction.notes);
      alert('📋 Message text copied to clipboard!');
    }
    setShowMenu(false);
  };

  const handleDownloadFirstImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (transaction.photos && transaction.photos.length > 0) {
      downloadImageAsJpeg(transaction.photos[0], `jbj_image_${transaction.id}.jpeg`);
    }
    setShowMenu(false);
  };

  return (
    <div className={`wa-bubble-row ${isWorkerSent ? 'is-outbound' : 'is-inbound'}`}>
      <div className={`wa-bubble ${isWorkerSent ? 'wa-bubble-out' : 'wa-bubble-in'}`}>
        {/* Context Menu Action Button */}
        <div className="wa-bubble-header">
          <span className="wa-sender-name">{isWorkerSent ? 'You' : 'Admin'}</span>
          {!isDeleted && (
            <button
              type="button"
              className="wa-menu-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Message options"
            >
              <i className="fa-solid fa-caret-down" />
            </button>
          )}
        </div>

        {/* Dropdown Options Menu */}
        {showMenu && (
          <div className="wa-bubble-dropdown" onClick={(e) => e.stopPropagation()}>
            {!isDeleted && (
              <button
                type="button"
                className="wa-dropdown-item"
                onClick={() => {
                  setShowMenu(false);
                  onReply({
                    id: transaction.id,
                    senderName: isWorkerSent ? 'You' : 'Admin',
                    notes: transaction.notes || 'Photo attachment',
                    photos: transaction.photos,
                  });
                }}
              >
                <i className="fa-solid fa-reply" /> Reply
              </button>
            )}

            {transaction.notes && !isDeleted && (
              <button type="button" className="wa-dropdown-item" onClick={handleCopy}>
                <i className="fa-solid fa-copy" /> Copy Text
              </button>
            )}

            {isWorkerSent && !isDeleted && isWithin30Mins && (
              <button
                type="button"
                className="wa-dropdown-item"
                onClick={() => {
                  setShowMenu(false);
                  onEdit(transaction);
                }}
              >
                <i className="fa-solid fa-pen-to-square" /> Edit Message
              </button>
            )}

            {isEdited && (
              <button
                type="button"
                className="wa-dropdown-item"
                onClick={() => {
                  setShowMenu(false);
                  onViewEditHistory(transaction);
                }}
              >
                <i className="fa-solid fa-clock-rotate-left" /> View Edit History ({editHistory.length})
              </button>
            )}

            {transaction.photos && transaction.photos.length > 0 && (
              <button type="button" className="wa-dropdown-item" onClick={handleDownloadFirstImage}>
                <i className="fa-solid fa-download" /> Download Image (JPEG)
              </button>
            )}

            {isWorkerSent && !isDeleted && (
              <button
                type="button"
                className="wa-dropdown-item text-danger"
                onClick={() => {
                  setShowMenu(false);
                  if (confirm('Delete this message for everyone?')) {
                    onDelete(transaction.id);
                  }
                }}
              >
                <i className="fa-solid fa-trash-can" /> Delete Message
              </button>
            )}
          </div>
        )}

        {/* Quoted Reply Banner */}
        {transaction.reply_to && !isDeleted && (
          <div className="wa-quoted-box">
            <div className="wa-quoted-sender">{transaction.reply_to.senderName}</div>
            <div className="wa-quoted-text">{transaction.reply_to.notes}</div>
          </div>
        )}

        {/* Deleted Message State */}
        {isDeleted ? (
          <div className="wa-deleted-msg">
            <i><i className="fa-solid fa-ban" /> This message was deleted</i>
          </div>
        ) : (
          <>
            {/* Determine if this transaction has structured gold/silver/cash specs */}
            {(() => {
              const hasCard = Boolean(transaction.weight_grams) || Boolean(transaction.amount_cash) || (Boolean(transaction.item_name) && transaction.item_name !== 'Ornament Item');

              return (
                <>
                  {/* 1. Category 3-Column Summary Card (Only if specs exist) */}
                  {hasCard && (
                    <div
                      style={{
                        margin: '4px 0 6px 0',
                        padding: '8px 10px',
                        background:
                          transaction.category === 'GOLD'
                            ? '#fffbe8'
                            : transaction.category === 'SILVER'
                            ? '#f8fafc'
                            : '#f0f9ff',
                        borderRadius: '10px',
                        border:
                          transaction.category === 'GOLD'
                            ? '1px solid #fde68a'
                            : transaction.category === 'SILVER'
                            ? '1px solid #cbd5e1'
                            : '1px solid #bae6fd',
                      }}
                    >
                      {/* Title Row */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>
                          {transaction.category === 'GOLD'
                            ? '🥇'
                            : transaction.category === 'SILVER'
                            ? '🥈'
                            : transaction.category === 'CASH'
                            ? '🏅'
                            : '👑'}
                        </span>
                        <span>
                          {transaction.item_name
                            ? transaction.item_name
                            : transaction.category === 'GOLD'
                            ? 'Raw Gold Bar'
                            : transaction.category === 'SILVER'
                            ? 'Raw Silver Bar'
                            : transaction.category === 'CASH'
                            ? 'Cash Transfer'
                            : 'Ornament Item'}
                        </span>
                      </div>

                      {/* 3-Column Spec Table */}
                      {transaction.weight_grams ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1.2fr',
                            gap: '4px',
                            fontSize: '0.68rem',
                            background: '#ffffff',
                            padding: '5px 8px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.2px' }}>
                              GROSS WT
                            </span>
                            <strong style={{ fontSize: '0.72rem', color: '#0f172a' }}>
                              {Number(transaction.weight_grams).toFixed(3)} g
                            </strong>
                          </div>

                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.2px' }}>
                              TOUNCH
                            </span>
                            <strong style={{ fontSize: '0.72rem', color: '#d97706' }}>
                              {transaction.touch_percentage || (transaction.category === 'SILVER' ? 80.0 : 100.0)}%
                            </strong>
                          </div>

                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.2px' }}>
                              100% PURE
                            </span>
                            <strong style={{ fontSize: '0.72rem', color: '#15803d' }}>
                              {Number(
                                (Number(transaction.weight_grams) *
                                  (Number(transaction.touch_percentage) || (transaction.category === 'SILVER' ? 80.0 : 100.0))) /
                                  100
                              ).toFixed(3)} g
                            </strong>
                          </div>
                        </div>
                      ) : transaction.amount_cash ? (
                        <div style={{ fontSize: '0.75rem', background: '#ffffff', padding: '5px 8px', borderRadius: '7px', border: '1px solid #cbd5e1' }}>
                          <span style={{ color: '#64748b', fontSize: '0.58rem', fontWeight: 700, display: 'block' }}>CASH AMOUNT</span>
                          <strong style={{ color: '#15803d', fontSize: '0.85rem' }}>₹{transaction.amount_cash.toLocaleString('en-IN')}</strong>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* 2. Text Content: Quoted block if card exists, plain chat text if normal message */}
                  {transaction.notes && (
                    hasCard ? (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#334155',
                          fontStyle: 'italic',
                          marginTop: '3px',
                          marginBottom: '5px',
                          background: '#f1f5f9',
                          padding: '4px 7px',
                          borderRadius: '5px',
                          borderLeft: '3px solid #cbd5e1',
                        }}
                      >
                        "{transaction.notes}"
                      </div>
                    ) : (
                      <p className="wa-bubble-text" style={{ margin: '2px 0 4px 0', whiteSpace: 'pre-wrap' }}>{transaction.notes}</p>
                    )
                  )}
                </>
              );
            })()}

            {/* 3. Photo Attachments Grid (at bottom of card) */}
            {transaction.photos && transaction.photos.length > 0 && (
              <div className="wa-photo-grid" style={{ marginTop: '6px' }}>
                {transaction.photos.map((pUrl, pIdx) => (
                  <div key={pIdx} className="wa-photo-wrapper">
                    <img
                      src={pUrl}
                      alt="Attachment"
                      onClick={() => onPreviewImage(pUrl)}
                      className="wa-photo-thumb"
                    />
                    <button
                      type="button"
                      className="wa-photo-dl-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImageAsJpeg(pUrl, `image_${pIdx + 1}.jpeg`);
                      }}
                      title="Download JPEG"
                    >
                      <i className="fa-solid fa-download" /> JPEG
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Message Footer: Timestamp, Edit Badge, Status Ticks */}
        <div className="wa-bubble-meta">
          {isEdited && !isDeleted && (
            <span
              className="wa-edited-badge"
              onClick={() => onViewEditHistory(transaction)}
              title="Click to view edit history timestamps"
            >
              (edited)
            </span>
          )}
          <span className="wa-timestamp">{formattedTime}</span>

          {isWorkerSent && (
            <span className="wa-status-ticks" style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }}>
              {transaction.status_state === 'FAILED' ? (
                <span className="wa-failed-badge" title="Sending failed. Tap to retry">
                  <i className="fa-solid fa-triangle-exclamation" /> Failed
                </span>
              ) : transaction.status_state === 'SENDING' ? (
                <i className="fa-solid fa-clock" style={{ color: '#94a3b8', fontSize: '0.72rem' }} title="Sending..." />
              ) : transaction.status_state === 'READ' || transaction.is_seen === 'YES' || transaction.read_at || transaction.seen_at ? (
                <i className="fa-solid fa-check-double" style={{ color: '#0284c7', fontSize: '0.78rem' }} title="Seen by Admin (Blue tick)" />
              ) : (
                <i className="fa-solid fa-check-double" style={{ color: '#94a3b8', fontSize: '0.78rem' }} title="Delivered to Admin" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
