import { useEffect, useRef } from 'react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className={`search-overlay${isOpen ? ' active' : ''}`}
      id="search-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="search-box">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          id="search-input"
          placeholder="Search for rings, necklaces, earrings…"
        />
        <button className="search-close" id="search-close" aria-label="Close search" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
