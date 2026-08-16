import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils';

export default function CartDrawer() {
  const { isCartOpen, closeCart, cart, removeFromCart, changeQty, cartTotal } = useCart();

  return (
    <>
      <div className={`cart-drawer${isCartOpen ? ' open' : ''}`} id="cart-drawer">
        <div className="cart-header">
          <h3 className="cart-title">Your Cart</h3>
          <button className="cart-close" id="cart-close" aria-label="Close cart" onClick={closeCart}>
            ✕
          </button>
        </div>

        <div className="cart-items" id="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty" id="cart-empty" style={{ display: 'flex' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p>Your cart is empty</p>
              <a href="#collections" className="btn btn-primary btn-sm" onClick={closeCart}>
                Start Shopping
              </a>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item.id} id={`cart-item-${item.id}`}>
                <div className="cart-item-img">
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>✦</span>
                  </div>
                </div>
                <div>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatPrice(item.price)}</div>
                  <div className="cart-item-qty">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>
                      −
                    </button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer" id="cart-footer">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span id="cart-subtotal-price">{formatPrice(cartTotal)}</span>
            </div>
            <a href="#" className="btn btn-primary btn-full">
              Proceed to Checkout
            </a>
            <p className="cart-note">Free shipping on this order ✓</p>
          </div>
        )}
      </div>

      <div
        className={`overlay-bg${isCartOpen ? ' active' : ''}`}
        id="overlay-bg"
        onClick={closeCart}
      />
    </>
  );
}
