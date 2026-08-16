import React from 'react';
import { WorkerTransaction } from '../../types/worker';

interface Props {
  transaction: WorkerTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditHistoryModal: React.FC<Props> = ({ transaction, isOpen, onClose }) => {
  if (!isOpen || !transaction) return null;

  const history = Array.isArray(transaction.edited_at_history) ? transaction.edited_at_history : [];

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="wa-dialog-header">
          <h3 className="wa-dialog-title">
            <i className="fa-solid fa-clock-rotate-left" /> Edit History Log
          </h3>
          <button type="button" className="wa-modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="wa-dialog-desc">
          Total edits recorded: <strong>{history.length}</strong>
        </p>

        {history.length === 0 ? (
          <div className="wa-history-empty">No edit timestamps recorded for this message.</div>
        ) : (
          <ul className="wa-history-list">
            {history.map((ts, idx) => (
              <li key={idx} className="wa-history-item">
                <span className="wa-history-num">#{idx + 1}</span>
                <span className="wa-history-time">
                  {new Date(ts).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="wa-dialog-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="wa-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
