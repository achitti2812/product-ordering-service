import { useEffect, useState } from 'react'
import { ArrowLeft, PackageOpen, RefreshCw, ShoppingBag, WifiOff } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import OrderStatusBadge, { getOrderStatusDetails } from '../components/OrderStatusBadge.jsx'
import { getOrderById, OrderNotFoundError } from '../services/orderService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function OrderDetailsLoading() {
  return (
    <main className="order-details-page page-shell" aria-label="Loading order details" aria-busy="true">
      <div className="order-details-card order-details-skeleton">
        <div className="skeleton order-skeleton-heading" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-short" />
      </div>
    </main>
  )
}

function OrderDetailsPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrder() {
      setStatus('loading')

      try {
        const orderData = await getOrderById(id, { signal: controller.signal })
        setOrder(orderData)
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setOrder(null)
        setStatus(error instanceof OrderNotFoundError ? 'not-found' : 'error')
      }
    }

    loadOrder()
    return () => controller.abort()
  }, [id, retryVersion])

  if (status === 'loading') {
    return <OrderDetailsLoading />
  }

  if (status === 'not-found') {
    return (
      <main className="order-details-page page-shell">
        <div className="details-state" role="status">
          <span className="catalog-state-icon" aria-hidden="true"><PackageOpen size={30} /></span>
          <h1>Order not found</h1>
          <p>The order may not exist, or Order Service may have restarted and cleared its in-memory history.</p>
          <Link className="retry-button" to="/orders">
            <ArrowLeft size={17} />
            Back to My Orders
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="order-details-page page-shell">
        <div className="details-state" role="alert">
          <span className="catalog-state-icon" aria-hidden="true"><WifiOff size={30} /></span>
          <h1>We couldn't load this order.</h1>
          <p>Make sure Order Service is running, then try again.</p>
          <button className="retry-button" type="button" onClick={() => setRetryVersion((value) => value + 1)}>
            <RefreshCw size={17} />
            Retry
          </button>
        </div>
      </main>
    )
  }

  const statusDetails = getOrderStatusDetails(order.status)
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <main className="order-details-page page-shell">
      <Link className="back-link" to="/orders">
        <ArrowLeft size={17} />
        Back to My Orders
      </Link>

      <article className="order-details-card">
        <header className="order-details-header">
          <div>
            <span className="eyebrow">Order details</span>
            <h1>Order #{order.id}</h1>
            <p>{itemCount} {itemCount === 1 ? 'item' : 'items'} in this order</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </header>

        <div className={`order-details-message ${statusDetails.className}`} role="status">
          {statusDetails.message}
        </div>

        <section className="order-details-items" aria-labelledby="order-items-heading">
          <h2 id="order-items-heading">Products</h2>
          {order.items.map((item) => (
            <div className="order-details-item" key={item.productId}>
              <div>
                <Link
                  to={`/products/${item.productId}`}
                  state={{ from: `/orders/${order.id}`, backLabel: 'Back to order details' }}
                >
                  {item.productName}
                </Link>
                <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
              </div>
              <strong>{formatCurrency(item.lineTotal)}</strong>
            </div>
          ))}
        </section>

        <div className="order-details-total">
          <span>Order total</span>
          <strong>{formatCurrency(order.totalAmount)}</strong>
        </div>

        <div className="order-details-actions">
          <Link className="secondary-button" to="/orders">Back to My Orders</Link>
          <Link className="retry-button" to="/#catalog">
            <ShoppingBag size={17} />
            Continue shopping
          </Link>
        </div>
      </article>
    </main>
  )
}

export default OrderDetailsPage
