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

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    return body.detail || body.message || 'The order could not be created.'
  } catch {
    return 'The order could not be created.'
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
