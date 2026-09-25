import { AlertTriangle, CheckCircle2, CircleX, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { formatCurrency } from '../utils/formatCurrency.js'

const resultContent = {
  CONFIRMED: {
    icon: CheckCircle2,
    title: 'Order confirmed',
    message: 'Your simulated payment succeeded and inventory was updated.',
    className: 'order-result-success',
  },
  PAYMENT_FAILED: {
    icon: CircleX,
    title: 'Payment was not successful',
    message: 'Your cart has been kept so you can review it. No inventory was reduced.',
    className: 'order-result-failure',
  },
  INVENTORY_UPDATE_FAILED: {
    icon: AlertTriangle,
    title: 'Inventory update needs attention',
    message: 'Payment may have succeeded, but inventory could not be fully updated. Your cart has been kept. Please do not place the order again.',
    className: 'order-result-warning',
  },
}

function OrderResultPage() {
  const location = useLocation()
  const order = location.state?.order

  if (!order) {
    return (
      <main className="order-result-page page-shell">
        <div className="empty-cart" role="status">
          <span className="empty-cart-icon" aria-hidden="true"><ShoppingBag size={34} /></span>
          <h1>No recent order result is available.</h1>
          <p>Order results are kept only while navigating through this browser session.</p>
          <Link className="retry-button" to="/#catalog">Continue shopping</Link>
        </div>
      </main>
    )
  }

  const content = resultContent[order.status] || {
    icon: AlertTriangle,
    title: 'Order status received',
    message: 'Review the response below before taking another action.',
    className: 'order-result-warning',
  }
  const StatusIcon = content.icon

  return (
    <main className="order-result-page page-shell">
      <section className={`order-result-card ${content.className}`} aria-labelledby="order-result-heading">
        <StatusIcon className="order-result-icon" size={42} aria-hidden="true" />
        <span className="order-status-label">{order.status}</span>
        <h1 id="order-result-heading">{content.title}</h1>
        <p>{content.message}</p>

        <div className="order-result-details">
          <div className="order-result-number">
            <span>Order</span>
            <strong>#{order.id}</strong>
          </div>
          <div className="order-result-items">
            {order.items?.map((item) => (
              <div className="order-result-item" key={item.productId}>
                <span>{item.quantity} × {item.productName}</span>
                <strong>{formatCurrency(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="order-result-total">
            <span>Total</span>
            <strong>{formatCurrency(order.totalAmount)}</strong>
          </div>
        </div>

        <div className="order-result-actions">
          {order.status !== 'CONFIRMED' && <Link className="secondary-button" to="/cart">Back to cart</Link>}
          <Link className="retry-button" to="/#catalog">Continue shopping</Link>
        </div>
      </section>
    </main>
  )
}

export default OrderResultPage
