import { useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, LockKeyhole, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useCartReconciliation } from '../hooks/useCartReconciliation.js'
import { reconcileCartItems } from '../services/cartReconciliation.js'
import {
  AmbiguousOrderError,
  createOrder,
  OrderServiceError,
} from '../services/orderService.js'
import {
  getCartItemIssue,
  productInformationChanged,
} from '../utils/cartValidation.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { showProductFallback } from '../utils/imageFallback.js'

function CheckoutPage() {
  const navigate = useNavigate()
  const {
    cartItems,
    cartItemCount,
    cartSubtotal,
    clearCart,
    refreshCartProduct,
    markCartItemUnavailable,
  } = useCart()
  const { status: refreshStatus, canCheckout, retry } = useCartReconciliation()
  const [submissionState, setSubmissionState] = useState({ status: 'idle', message: '' })
  const submittingRef = useRef(false)

  async function placeOrder() {
    if (submittingRef.current || !canCheckout) {
      return
    }

    submittingRef.current = true
    setSubmissionState({ status: 'validating', message: '' })
    const cartSnapshot = cartItems

    try {
      const results = await reconcileCartItems(cartSnapshot)

      if (results.some((result) => result.status === 'error')) {
        setSubmissionState({
          status: 'validation-error',
          message: "We couldn't verify current product availability. Your order was not submitted.",
        })
        return
      }

      let productInformationWasUpdated = false
      let hasUnavailableProduct = false

      results.forEach((result) => {
        if (result.status === 'not-found') {
          hasUnavailableProduct = true
          markCartItemUnavailable(result.item.id)
          return
        }

        if (productInformationChanged(result.item, result.product)) {
          productInformationWasUpdated = true
        }

        refreshCartProduct(result.product)
      })

      if (hasUnavailableProduct) {
        setSubmissionState({
          status: 'cart-changed',
          message: 'A product is no longer available. Return to your cart to review it.',
        })
        return
      }

      const currentItems = results.map(({ item, product }) => ({
        ...item,
        price: Number(product.price),
        stock: Number(product.stock),
        isAvailable: true,
      }))
      const issue = currentItems.map(getCartItemIssue).find(Boolean)

      if (issue || productInformationWasUpdated) {
        setSubmissionState({
          status: 'cart-changed',
          message: issue
            ? `${issue} Your cart was updated. Please review it before placing the order.`
            : 'Price or stock changed. Your cart was updated; please review it before placing the order.',
        })
        return
      }

      setSubmissionState({ status: 'submitting', message: '' })
      const requestItems = cartSnapshot.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))
      const order = await createOrder(requestItems)

      if (order.status === 'CONFIRMED') {
        clearCart()
      }

      navigate('/order-result', { state: { order } })
    } catch (error) {
      if (error instanceof AmbiguousOrderError) {
        setSubmissionState({
          status: 'ambiguous-error',
          message: 'We could not confirm the order result. Your cart has been kept. Please avoid submitting again until you verify the order status.',
        })
      } else if (error instanceof OrderServiceError) {
        setSubmissionState({
          status: 'order-error',
          message: error.status >= 500
            ? 'The Order Service could not complete the request. Your cart has been kept.'
            : `The order was not accepted. ${error.message}`,
        })
      } else {
        setSubmissionState({
          status: 'validation-error',
          message: "We couldn't verify current product availability. Your order was not submitted.",
        })
      }
    } finally {
      submittingRef.current = false
    }
  }

  if (cartItems.length === 0) {
    return (
      <main className="checkout-page page-shell">
        <div className="empty-cart" role="status">
          <span className="empty-cart-icon" aria-hidden="true"><ShoppingBag size={34} /></span>
          <h1>Your cart is empty.</h1>
          <p>Add products before beginning checkout.</p>
          <Link className="retry-button" to="/#catalog">Continue shopping</Link>
        </div>
      </main>
    )
  }

  const isWorking = submissionState.status === 'validating' || submissionState.status === 'submitting'
  const safeValidationRetry = submissionState.status === 'validation-error'

  return (
    <main className="checkout-page page-shell">
      <Link className="back-link" to="/cart">
        <ArrowLeft size={17} />
        Back to cart
      </Link>

      <div className="checkout-heading">
        <span className="eyebrow">Final review</span>
        <h1>Checkout</h1>
        <p>Review your order before sending it to the ReacSpi Order Service.</p>
      </div>

      {refreshStatus === 'error' && (
        <div className="checkout-message checkout-message-warning" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Product availability could not be verified.</strong>
            <p>Your order cannot be submitted until Product Service is available.</p>
          </div>
          <button type="button" onClick={retry}>Retry validation</button>
        </div>
      )}

      {submissionState.message && (
        <div className="checkout-message checkout-message-warning" role="alert">
          <AlertTriangle size={20} />
          <div><p>{submissionState.message}</p></div>
          {safeValidationRetry && (
            <button type="button" onClick={placeOrder}>Check again</button>
          )}
        </div>
      )}

      <div className="checkout-layout">
        <section className="checkout-review" aria-labelledby="checkout-review-heading">
          <div className="checkout-section-heading">
            <h2 id="checkout-review-heading">Order review</h2>
            <span>{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="checkout-items">
            {cartItems.map((item) => {
              const lineTotal = (Math.round(item.price * 100) * item.quantity) / 100

              return (
                <article className="checkout-item" key={item.id}>
                  <Link to={`/products/${item.id}`} state={{ from: '/checkout', backLabel: 'Back to checkout' }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      onError={showProductFallback}
                    />
                  </Link>
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <strong>{formatCurrency(lineTotal)}</strong>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="checkout-summary" aria-labelledby="checkout-summary-heading">
          <h2 id="checkout-summary-heading">Order total</h2>
          <div className="summary-row">
            <span>Items</span>
            <strong>{cartItemCount}</strong>
          </div>
          <div className="summary-row summary-subtotal">
            <span>Total</span>
            <strong>{formatCurrency(cartSubtotal)}</strong>
          </div>
          <p className="simulation-note"><LockKeyhole size={16} /> Payment is simulated for this demo.</p>
          <button
            className="checkout-button"
            type="button"
            disabled={!canCheckout || isWorking}
            onClick={placeOrder}
          >
            {submissionState.status === 'validating' && 'Checking stock…'}
            {submissionState.status === 'submitting' && 'Placing order…'}
            {!isWorking && (refreshStatus === 'loading' ? 'Checking availability…' : 'Place order')}
          </button>
          <p>No card or address is collected. The backend calculates prices and processes one simulated payment.</p>
        </aside>
      </div>
    </main>
  )
}

export default CheckoutPage
