import { ArrowLeft, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import CartItem from '../components/CartItem.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useCartReconciliation } from '../hooks/useCartReconciliation.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function CartPage() {
  const navigate = useNavigate()
  const {
    cartItems,
    cartItemCount,
    cartSubtotal,
    clearCart,
  } = useCart()
  const {
    status: refreshStatus,
    notices: refreshNotices,
    canCheckout,
    retry,
  } = useCartReconciliation()

  function confirmClearCart() {
    if (window.confirm('Remove all items from your cart?')) {
      clearCart()
    }
  }

  if (cartItems.length === 0) {
    return (
      <main className="cart-page page-shell">
        <div className="empty-cart" role="status">
          <span className="empty-cart-icon" aria-hidden="true"><ShoppingBag size={34} /></span>
          <h1>Your cart is empty.</h1>
          <p>Browse the catalog and add something useful when you are ready.</p>
          <Link className="retry-button" to="/#catalog">
            Continue shopping
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="cart-page page-shell">
      <Link className="back-link" to="/#catalog">
        <ArrowLeft size={17} />
        Continue shopping
      </Link>

      <div className="cart-page-heading">
        <div>
          <span className="eyebrow">Saved for this browser</span>
          <h1>Shopping cart</h1>
          <p>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in your cart</p>
        </div>
        <button className="clear-cart-button" type="button" onClick={confirmClearCart}>
          <Trash2 size={17} />
          Clear cart
        </button>
      </div>

      {refreshStatus === 'loading' && (
        <div className="cart-refresh-message" role="status">
          <RefreshCw className="refresh-spin" size={17} />
          Checking current prices and stock…
        </div>
      )}
      {refreshStatus === 'error' && (
        <div className="cart-refresh-message cart-refresh-warning" role="alert">
          <span>We couldn't refresh every item. Stored prices and stock may be out of date.</span>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <div className="cart-layout">
        <section className="cart-items" aria-label="Cart items">
          {cartItems.map((item) => (
            <CartItem item={item} notice={refreshNotices[item.id]} key={item.id} />
          ))}
        </section>

        <aside className="cart-summary" aria-labelledby="cart-summary-heading">
          <h2 id="cart-summary-heading">Order summary</h2>
          <div className="summary-row">
            <span>Total items</span>
            <strong>{cartItemCount}</strong>
          </div>
          <div className="summary-row summary-subtotal">
            <span>Subtotal</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <p>This demo does not add taxes or shipping fees.</p>
          <button
            className="checkout-button"
            type="button"
            disabled={!canCheckout}
            onClick={() => navigate('/checkout')}
          >
            {refreshStatus === 'loading' ? 'Checking availability…' : 'Proceed to checkout'}
          </button>
        </aside>
      </div>
    </main>
  )
}

export default CartPage
