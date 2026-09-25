import { useEffect, useState } from 'react'
import { PackageOpen, RefreshCw, ShoppingBag, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import OrderStatusBadge from '../components/OrderStatusBadge.jsx'
import { getOrders } from '../services/orderService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function OrdersLoading() {
  return (
    <div className="order-history-list" aria-label="Loading order history" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="order-card order-card-skeleton" aria-hidden="true" key={index}>
          <div className="skeleton order-skeleton-heading" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line-short" />
          <div className="skeleton skeleton-button" />
        </div>
      ))}
    </div>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      setStatus('loading')

      try {
        const orderData = await getOrders({ signal: controller.signal })
        setOrders(orderData)
        setStatus('success')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrders([])
          setStatus('error')
        }
      }
    }

    loadOrders()
    return () => controller.abort()
  }, [retryVersion])

  return (
    <main className="orders-page page-shell">
      <div className="orders-heading">
        <span className="eyebrow">Stored by Order Service</span>
        <h1>My Orders</h1>
        <p>Review every order created while the in-memory Order Service is running.</p>
      </div>

      {status === 'loading' && <OrdersLoading />}

      {status === 'error' && (
        <div className="details-state" role="alert">
          <span className="catalog-state-icon" aria-hidden="true"><WifiOff size={30} /></span>
          <h2>We couldn't load your orders.</h2>
          <p>Make sure Order Service is running, then try again.</p>
          <button className="retry-button" type="button" onClick={() => setRetryVersion((value) => value + 1)}>
            <RefreshCw size={17} />
            Retry
          </button>
        </div>
      )}

      {status === 'success' && orders.length === 0 && (
        <div className="details-state" role="status">
          <span className="catalog-state-icon" aria-hidden="true"><PackageOpen size={30} /></span>
          <h2>No orders yet.</h2>
          <p>Your orders will appear here after you place one.</p>
          <Link className="retry-button" to="/#catalog">
            <ShoppingBag size={17} />
            Start shopping
          </Link>
        </div>
      )}

      {status === 'success' && orders.length > 0 && (
        <section className="order-history-list" aria-label="Order history">
          {orders.map((order) => {
            const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)

            return (
              <article className="order-card" key={order.id}>
                <div className="order-card-heading">
                  <div>
                    <span>Order</span>
                    <h2>#{order.id}</h2>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <ul className="order-card-products" aria-label={`Products in order ${order.id}`}>
                  {order.items.map((item) => (
                    <li key={item.productId}>
                      <span>{item.productName}</span>
                      <strong>× {item.quantity}</strong>
                    </li>
                  ))}
                </ul>

                <div className="order-card-footer">
                  <div>
                    <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </div>
                  <Link className="secondary-button" to={`/orders/${order.id}`}>
                    View details
                  </Link>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

export default OrdersPage
