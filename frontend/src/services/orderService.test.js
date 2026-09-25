import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AmbiguousOrderError,
  createOrder,
  getOrderById,
  getOrders,
  OrderNotFoundError,
  OrderServiceError,
} from './orderService.js'

describe('Order Service client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the multi-product request to the configured endpoint', async () => {
    const order = { id: 1, items: [], totalAmount: 209.97, status: 'CONFIRMED' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(order),
    })
    vi.stubGlobal('fetch', fetchMock)
    const items = [
      { productId: 2, quantity: 2 },
      { productId: 3, quantity: 1 },
    ]

    await expect(createOrder(items)).resolves.toEqual(order)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8081/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: undefined,
    })
  })

  it('reports HTTP responses separately from ambiguous network failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ detail: 'Invalid order' }),
      })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createOrder([])).rejects.toEqual(expect.objectContaining({
      message: 'Invalid order',
      status: 400,
      constructor: OrderServiceError,
    }))
    await expect(createOrder([])).rejects.toBeInstanceOf(AmbiguousOrderError)
  })

  it('gets the full order history with AbortController support', async () => {
    const orders = [{ id: 2 }, { id: 1 }]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(orders),
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(getOrders({ signal: controller.signal })).resolves.toEqual(orders)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8081/orders', {
      signal: controller.signal,
    })
  })

  it('gets one order by its encoded ID', async () => {
    const order = { id: 7, items: [], totalAmount: 10, status: 'CONFIRMED' }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(order),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getOrderById('7')).resolves.toEqual(order)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8081/orders/7', {
      signal: undefined,
    })
  })

  it('distinguishes a missing order from an unavailable Order Service', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getOrderById(999)).rejects.toBeInstanceOf(OrderNotFoundError)
    await expect(getOrders()).rejects.toEqual(expect.objectContaining({
      message: 'Order Service is unavailable.',
      status: 0,
      constructor: OrderServiceError,
    }))
  })
})
