const orderApiUrl = (
  import.meta.env.VITE_ORDER_API_URL || 'http://localhost:8081'
).replace(/\/$/, '')

export class OrderServiceError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'OrderServiceError'
    this.status = status
  }
}

export class AmbiguousOrderError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AmbiguousOrderError'
  }
}

export class OrderNotFoundError extends Error {
  constructor(message = 'Order not found') {
    super(message)
    this.name = 'OrderNotFoundError'
  }
}

async function readErrorMessage(response, fallbackMessage = 'The order request could not be completed.') {
  try {
    const body = await response.json()
    return body.detail || body.message || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

async function getOrderData(path, { signal } = {}) {
  let response

  try {
    response = await fetch(`${orderApiUrl}${path}`, { signal })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new OrderServiceError('Order Service is unavailable.', 0)
  }

  if (response.status === 404) {
    throw new OrderNotFoundError()
  }

  if (!response.ok) {
    throw new OrderServiceError(await readErrorMessage(response), response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new OrderServiceError('Order Service returned an unexpected response.', response.status)
  }
}

export async function createOrder(items, { signal } = {}) {
  let response

  try {
    response = await fetch(`${orderApiUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new AmbiguousOrderError('The order result could not be confirmed.')
  }

  if (!response.ok) {
    throw new OrderServiceError(await readErrorMessage(response), response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new AmbiguousOrderError('The Order Service returned an unreadable result.')
  }
}

export async function getOrders({ signal } = {}) {
  const orders = await getOrderData('/orders', { signal })

  if (!Array.isArray(orders)) {
    throw new OrderServiceError('Order Service returned an unexpected response.', 200)
  }

  return orders
}

export async function getOrderById(orderId, { signal } = {}) {
  const order = await getOrderData(`/orders/${encodeURIComponent(orderId)}`, { signal })

  if (!order || typeof order !== 'object' || Array.isArray(order)) {
    throw new OrderServiceError('Order Service returned an unexpected response.', 200)
  }

  return order
}
