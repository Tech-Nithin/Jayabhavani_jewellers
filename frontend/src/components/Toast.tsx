import { useEffect } from 'react';
import { useCart } from '../context/CartContext';

export default function Toast() {
  const { toast } = useCart();

  useEffect(() => {
    // no-op – visibility is driven by CSS class via `toast` string
  }, [toast]);

  return (
    <div className={`toast${toast ? ' show' : ''}`} id="toast">
      {toast}
    </div>
  );
}
