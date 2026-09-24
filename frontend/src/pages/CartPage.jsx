import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CartItem from '../components/CartItem.jsx'
import { useCart } from '../context/CartContext.jsx'
import { getProductById, ProductNotFoundError } from '../services/productService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function CartPage() {
  const {
    cartItems,
    cartItemCount,
    cartSubtotal,
    clearCart,
    refreshCartProduct,
    markCartItemUnavailable,
  } = useCart()
  const [refreshStatus, setRefreshStatus] = useState('idle')
  const [refreshNotices, setRefreshNotices] = useState({})
  const [retryVersion, setRetryVersion] = useState(0)
  const itemIds = useMemo(() => cartItems.map((item) => item.id).join(','), [cartItems])

  useEffect(() => {
    if (!itemIds) {
      setRefreshStatus('idle')
      setRefreshNotices({})
      return undefined
    }

    const controller = new AbortController()
    const itemsToRefresh = cartItems

    async function refreshProducts() {
      setRefreshStatus('loading')
      setRefreshNotices({})

      const results = await Promise.all(itemsToRefresh.map(async (item) => {
        try {
          const product = await getProductById(item.id, { signal: controller.signal })
          return { item, product, status: 'success' }
        } catch (error) {
          if (error.name === 'AbortError') {
            return { status: 'aborted' }
          }

          if (error instanceof ProductNotFoundError) {
            return { item, status: 'not-found' }
          }

          return { item, status: 'error' }
        }
      }))

      if (controller.signal.aborted) {
        return
      }

      const nextNotices = {}
      let hasRequestError = false

      results.forEach((result) => {
        if (result.status === 'success') {
          const { item, product } = result

          if (product.stock === 0) {
            nextNotices[item.id] = 'Current inventory shows this item is out of stock.'
          } else if (item.quantity > product.stock) {
            nextNotices[item.id] = `Quantity adjusted to the current stock of ${product.stock}.`
          } else if (Number(item.price) !== Number(product.price)) {
            nextNotices[item.id] = 'Price updated using the latest product information.'
          }

          refreshCartProduct(product)
        } else if (result.status === 'not-found') {
          markCartItemUnavailable(result.item.id)
          nextNotices[result.item.id] = 'Product Service no longer lists this item.'
        } else if (result.status === 'error') {
          hasRequestError = true
        }
      })

      setRefreshNotices(nextNotices)
      setRefreshStatus(hasRequestError ? 'error' : 'success')
    }

    refreshProducts()
    return () => controller.abort()
  }, [itemIds, retryVersion, markCartItemUnavailable, refreshCartProduct])

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
          <button type="button" onClick={() => setRetryVersion((value) => value + 1)}>
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
          <p>Taxes and shipping are not included and will be handled during a future checkout step.</p>
          <button className="checkout-button" type="button" disabled>
            Checkout coming in Step 6
          </button>
        </aside>
      </div>
    </main>
  )
}

export default CartPage
