import React, { useRef, useEffect } from 'react';
import { WorkerTransaction, ReplyMessageData } from '../../types/worker';
import { WhatsAppMessageBubble } from './WhatsAppMessageBubble';

interface Props {
  transactions: WorkerTransaction[];
  loading: boolean;
  workerId: string;
  onReply: (replyData: ReplyMessageData) => void;
  onEdit: (tx: WorkerTransaction) => void;
  onDelete: (txId: string) => void;
  onViewEditHistory: (tx: WorkerTransaction) => void;
  onPreviewImage: (url: string) => void;
  onLoadEarlier?: () => void;
  isLoadingEarlier?: boolean;
}

export const WhatsAppChatArea: React.FC<Props> = ({
  transactions,
  loading,
  workerId,
  onReply,
  onEdit,
  onDelete,
  onViewEditHistory,
  onPreviewImage,
  onLoadEarlier,
  isLoadingEarlier,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (transactions.length > 0 && !isLoadingEarlier) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transactions.length, isLoadingEarlier]);

  return (
    <div className="wa-chat-area">
      {loading ? (
        <div className="wa-chat-center">
          <div className="wa-spinner" />
          <p className="wa-center-text">Loading chat history...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="wa-chat-center">
          <div className="wa-empty-icon">
            <i className="fa-solid fa-comments" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '8px' }} />
          </div>
          <p className="wa-center-title">No messages yet</p>
          <p className="wa-center-sub">Send photos or notes to Admin to start your transaction history.</p>
        </div>
      ) : (
        <>
          {onLoadEarlier && (
            <div className="wa-load-earlier-container">
              <button
                type="button"
                className="wa-load-earlier-btn"
                onClick={onLoadEarlier}
                disabled={isLoadingEarlier}
              >
                {isLoadingEarlier ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Loading earlier 7 days...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-angles-up" /> Load Earlier Messages (Previous 7 Days)
                  </>
                )}
              </button>
            </div>
          )}

          <div className="wa-encryption-badge">
            <i className="fa-solid fa-lock" /> Messages are secured & recorded directly with Jaya Bhavani Jewellers Admin
          </div>

          {transactions.map((tx) => {
            const isWorkerSent = tx.direction === 'INCOMING';

            return (
              <WhatsAppMessageBubble
                key={tx.id}
                transaction={tx}
                isWorkerSent={isWorkerSent}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewEditHistory={onViewEditHistory}
                onPreviewImage={onPreviewImage}
              />
            );
          })}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
};
