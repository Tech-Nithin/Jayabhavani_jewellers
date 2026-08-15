import React, { useRef, useState } from 'react';
import { ReplyMessageData, TransactionCategory } from '../../types/worker';
import { NewTransactionModal } from '../modals/NewTransactionModal';

interface Props {
  replyTo: ReplyMessageData | null;
  onClearReply: () => void;
  onSendMessage: (notes: string, photos: File[]) => Promise<void>;
  onOpenSpecModal?: () => void;
  isSending: boolean;
}

export const WhatsAppInputBar: React.FC<Props> = ({
  replyTo,
  onClearReply,
  onSendMessage,
  onOpenSpecModal,
  isSending,
}) => {
  const [text, setText] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    setShowAttachMenu(false);
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && photoFiles.length === 0) return;

    const currentText = text;
    const currentFiles = [...photoFiles];

    setText('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setShowAttachMenu(false);

    try {
      await onSendMessage(currentText, currentFiles);
    } catch (err) {
      // restore text on failure
      setText(currentText);
      setPhotoFiles(currentFiles);
    }
  };

  const handleCameraClick = () => {
    setShowAttachMenu(false);
    if (cameraInputRef.current) {
      cameraInputRef.current.removeAttribute('multiple');
      cameraInputRef.current.setAttribute('accept', 'image/*');
      cameraInputRef.current.setAttribute('capture', 'environment');
      cameraInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    setShowAttachMenu(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.removeAttribute('capture');
      galleryInputRef.current.setAttribute('accept', 'image/*');
      galleryInputRef.current.setAttribute('multiple', 'multiple');
      galleryInputRef.current.click();
    }
  };

  return (
    <footer className="wa-input-footer">
      {/* Quoted reply banner */}
      {replyTo && (
        <div className="wa-input-reply-banner">
          <div className="wa-reply-border" />
          <div className="wa-reply-content">
            <div className="wa-reply-title">Replying to {replyTo.senderName}</div>
            <div className="wa-reply-text">{replyTo.notes}</div>
          </div>
          <button type="button" className="wa-reply-close-btn" onClick={onClearReply}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Photo attachments preview strip */}
      {photoPreviews.length > 0 && (
        <div className="wa-preview-strip">
          {photoPreviews.map((src, idx) => (
            <div key={idx} className="wa-preview-item">
              <img src={src} alt="Preview" className="wa-preview-img" />
              <button type="button" className="wa-preview-remove" onClick={() => removePhoto(idx)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input controls form */}
      <form onSubmit={handleSubmit} className="wa-input-form" style={{ position: 'relative' }}>
        {/* Hidden Input for Gallery Pick */}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={galleryInputRef}
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />

        {/* Hidden Input for Camera Capture */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />

        {/* 1. Text Message Input Field FIRST */}
        <input
          type="text"
          placeholder="Type message to Admin..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="wa-text-input"
        />

        {/* 2. Attachment Paperclip Button & Popover SECOND */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="wa-icon-btn"
            title="Attach options"
          >
            <i className="fa-solid fa-paperclip" />
          </button>

          {showAttachMenu && (
            <div className="wa-attach-popover" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="wa-attach-item"
                style={{ color: '#b45309', borderBottom: '1px solid #f1f5f9' }}
                onClick={() => {
                  setShowAttachMenu(false);
                  if (onOpenSpecModal) onOpenSpecModal();
                }}
              >
                <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} /> Gold / Silver / Cash Specs
              </button>
              <button
                type="button"
                className="wa-attach-item"
                onClick={handleCameraClick}
              >
                <i className="fa-solid fa-camera" /> Camera (Take Photo)
              </button>
              <button
                type="button"
                className="wa-attach-item"
                onClick={handleGalleryClick}
              >
                <i className="fa-solid fa-image" /> Gallery (Choose Photos)
              </button>
            </div>
          )}
        </div>

        {/* 3. Send Button THIRD */}
        <button
          type="submit"
          disabled={isSending || (!text.trim() && photoFiles.length === 0)}
          className="wa-send-btn"
        >
          {isSending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
        </button>
      </form>
    </footer>
  );
};
