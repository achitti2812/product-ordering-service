const statusDetails = {
  CONFIRMED: {
    label: 'Confirmed',
    className: 'order-status-confirmed',
    message: 'Your simulated payment succeeded and inventory was updated.',
  },
  PAYMENT_FAILED: {
    label: 'Payment failed',
    className: 'order-status-failed',
    message: 'Payment was unsuccessful. No inventory was reduced.',
  },
  INVENTORY_UPDATE_FAILED: {
    label: 'Inventory update failed',
    className: 'order-status-warning',
    message: 'Payment may have succeeded, but inventory could not be fully updated.',
  },
}

export function getOrderStatusDetails(status) {
  return statusDetails[status] || {
    label: 'Status unavailable',
    className: 'order-status-warning',
    message: 'The latest order status could not be recognized.',
  }
}

function OrderStatusBadge({ status }) {
  const details = getOrderStatusDetails(status)

  return (
    <span className={`order-status-badge ${details.className}`}>
      {details.label}
    </span>
  )
}

export default OrderStatusBadge
