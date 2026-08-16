import React, { useState, useEffect } from 'react';
import { WorkerTransaction } from '../../types/worker';

interface Props {
  transaction: WorkerTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionId: string, newNotes: string) => Promise<void>;
}

const toSentenceCase = (str?: string | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const EditMessageModal: React.FC<Props> = ({ transaction, isOpen, onClose, onSave }) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsSaving(true);
    try {
      await onSave(transaction.id, toSentenceCase(notes.trim()));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="wa-dialog-title">
          <i className="fa-solid fa-pen-to-square" /> Edit Message
        </h3>
        <p className="wa-dialog-desc">Editing this message will record the new timestamp in the edit history array.</p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={notes}
            autoCapitalize="sentences"
            onChange={(e) => setNotes(toSentenceCase(e.target.value))}
            className="wa-dialog-textarea"
            rows={4}
            placeholder="Type updated message notes..."
          />

          <div className="wa-dialog-actions">
            <button type="button" className="wa-btn-cancel" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="wa-btn-save" disabled={isSaving || !notes.trim()}>
              {isSaving ? 'Saving...' : 'Save Edit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
