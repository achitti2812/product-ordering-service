import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import {
  getOrderById,
  getOrders,
  OrderNotFoundError,
  OrderServiceError,
} from './services/orderService.js'

vi.mock('./services/orderService.js', () => {
  class MockOrderServiceError extends Error {
    constructor(message, status) {
      super(message)
      this.status = status
    }
  }

  class MockOrderNotFoundError extends Error {}

  return {
    createOrder: vi.fn(),
    getOrders: vi.fn(),
    getOrderById: vi.fn(),
    OrderServiceError: MockOrderServiceError,
    OrderNotFoundError: MockOrderNotFoundError,
    AmbiguousOrderError: class extends Error {},
  }
})

const confirmedOrder = {
  id: 1,
  items: [
    {
      productId: 2,
      productName: 'Headphones',
      quantity: 2,
      unitPrice: 79.99,
      lineTotal: 159.98,
    },
    {
      productId: 3,
      productName: 'Keyboard',
      quantity: 1,
      unitPrice: 49.99,
      lineTotal: 49.99,
    },
  ],
  totalAmount: 209.97,
  status: 'CONFIRMED',
}

const failedOrder = {
  id: 2,
  items: [
    {
      productId: 1,
      productName: 'Laptop',
      quantity: 1,
      unitPrice: 999.99,
      lineTotal: 999.99,
    },
    {
      productId: 2,
      productName: 'Headphones',
      quantity: 1,
      unitPrice: 79.99,
      lineTotal: 79.99,
    },
  ],
  totalAmount: 1079.98,
  status: 'PAYMENT_FAILED',
}

const inventoryFailedOrder = {
  ...confirmedOrder,
  id: 3,
  status: 'INVENTORY_UPDATE_FAILED',
}

function renderApp(initialEntry = '/orders') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

describe('order history', () => {
  beforeEach(() => {
    getOrders.mockReset()
    getOrderById.mockReset()
    getOrders.mockResolvedValue([failedOrder, confirmedOrder])
    getOrderById.mockImplementation((id) => (
      Promise.resolve(Number(id) === 2 ? failedOrder : confirmedOrder)
    ))
  })

  it('uses the existing Orders header navigation to open /orders', async () => {
    const user = userEvent.setup()
    renderApp('/cart')

    const ordersLink = screen.getByRole('link', { name: 'Orders' })
    expect(ordersLink).toHaveAttribute('href', '/orders')
    expect(screen.queryByText('Account')).not.toBeInTheDocument()
    await user.click(ordersLink)

    expect(await screen.findByRole('heading', { name: 'Order history' })).toBeInTheDocument()
    expect(getOrders).toHaveBeenCalledTimes(1)
  })

  it('loads order history in the newest-first order returned by the backend', async () => {
    renderApp()

    const history = await screen.findByRole('region', { name: 'Order history' })
    const orderHeadings = within(history).getAllByRole('heading', { level: 2 })

    expect(orderHeadings.map((heading) => heading.textContent)).toEqual(['#2', '#1'])
  })

  it('shows accessible human-readable badges for every order status', async () => {
    getOrders.mockResolvedValue([inventoryFailedOrder, failedOrder, confirmedOrder])
    renderApp()

    expect(await screen.findByText('Inventory update failed')).toBeInTheDocument()
    expect(screen.getByText('Payment failed')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('formats order totals and displays total item quantities', async () => {
    renderApp()

    expect(await screen.findByText('$1,079.98')).toBeInTheDocument()
    expect(screen.getByText('$209.97')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('shows a shopping action for an empty history', async () => {
    getOrders.mockResolvedValue([])
    renderApp()

    expect(await screen.findByRole('heading', { name: 'No orders yet.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/#catalog')
  })

  it('shows an Order Service error and retries successfully', async () => {
    const user = userEvent.setup()
    getOrders
      .mockRejectedValueOnce(new OrderServiceError('Unavailable', 0))
      .mockResolvedValueOnce([confirmedOrder])
    renderApp()

    expect(await screen.findByRole('heading', { name: "We couldn't load the order history." })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: '#1' })).toBeInTheDocument()
    expect(getOrders).toHaveBeenCalledTimes(2)
  })

  it('opens an order details route from View details', async () => {
    const user = userEvent.setup()
    renderApp()

    const links = await screen.findAllByRole('link', { name: 'View details' })
    await user.click(links[0])

    expect(await screen.findByRole('heading', { name: 'Order #2' })).toBeInTheDocument()
    expect(getOrderById).toHaveBeenCalledWith(
      '2',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('fetches an order independently on a direct details route', async () => {
    renderApp('/orders/1')

    expect(await screen.findByRole('heading', { name: 'Order #1' })).toBeInTheDocument()
    expect(getOrderById).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(getOrders).not.toHaveBeenCalled()
  })

  it('shows Order not found for an unknown order ID', async () => {
    getOrderById.mockRejectedValue(new OrderNotFoundError('Not found'))
    renderApp('/orders/999')

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to orders' })).toHaveAttribute('href', '/orders')
  })

  it('shows every order item, unit calculation, and the backend total', async () => {
    renderApp('/orders/1')

    await screen.findByRole('heading', { name: 'Order #1' })
    expect(screen.getByRole('link', { name: 'Headphones' })).toHaveAttribute('href', '/products/2')
    expect(screen.getByText('2 × $79.99')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Keyboard' })).toHaveAttribute('href', '/products/3')
    expect(screen.getByText('1 × $49.99')).toBeInTheDocument()
    expect(screen.getByText('$159.98')).toBeInTheDocument()
    expect(screen.getByText('$209.97')).toBeInTheDocument()
  })

  it('shows a safe inventory-update-failure message without payment actions', async () => {
    getOrderById.mockResolvedValue(inventoryFailedOrder)
    renderApp('/orders/3')

    expect(await screen.findByText('Inventory update failed')).toBeInTheDocument()
    expect(screen.getByText('Payment may have succeeded, but inventory could not be fully updated.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay|retry payment/i })).not.toBeInTheDocument()
  })

  it('shows a recoverable details error and retries the GET request', async () => {
    const user = userEvent.setup()
    getOrderById
      .mockRejectedValueOnce(new OrderServiceError('Unavailable', 0))
      .mockResolvedValueOnce(confirmedOrder)
    renderApp('/orders/1')

    expect(await screen.findByRole('heading', { name: "We couldn't load this order." })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Order #1' })).toBeInTheDocument()
    expect(getOrderById).toHaveBeenCalledTimes(2)
  })
})
