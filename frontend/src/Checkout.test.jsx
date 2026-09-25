import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { CART_STORAGE_KEY } from './context/CartContext.jsx'
import {
  AmbiguousOrderError,
  createOrder,
  OrderServiceError,
} from './services/orderService.js'
import {
  getProductById,
  ProductNotFoundError,
} from './services/productService.js'

vi.mock('./services/productService.js', () => {
  class MockProductNotFoundError extends Error {}

  return {
    getProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn(),
    ProductNotFoundError: MockProductNotFoundError,
  }
})

vi.mock('./services/orderService.js', () => {
  class MockOrderServiceError extends Error {
    constructor(message, status) {
      super(message)
      this.status = status
    }
  }

  class MockAmbiguousOrderError extends Error {}
  class MockOrderNotFoundError extends Error {}

  return {
    createOrder: vi.fn(),
    getOrders: vi.fn(),
    getOrderById: vi.fn(),
    OrderServiceError: MockOrderServiceError,
    AmbiguousOrderError: MockAmbiguousOrderError,
    OrderNotFoundError: MockOrderNotFoundError,
  }
})

const headphones = {
  id: 2,
  name: 'Headphones',
  description: 'Wireless headphones.',
  category: 'Electronics',
  price: 79.99,
  stock: 25,
  imageUrl: 'https://example.com/headphones.jpg',
}

const keyboard = {
  id: 3,
  name: 'Keyboard',
  description: 'A comfortable keyboard.',
  category: 'Electronics',
  price: 49.99,
  stock: 40,
  imageUrl: 'https://example.com/keyboard.jpg',
}

const confirmedOrder = {
  id: 17,
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

function storedItem(product, quantity = 1) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    stock: product.stock,
    quantity,
    isAvailable: true,
  }
}

function seedCart(items = [storedItem(headphones, 2), storedItem(keyboard)]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

function renderApp(initialEntry = '/checkout') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

function currentProduct(productId) {
  return productId === headphones.id ? headphones : keyboard
}

async function readyPlaceOrderButton() {
  return screen.findByRole('button', { name: 'Place order' })
}

describe('checkout flow', () => {
  beforeEach(() => {
    getProductById.mockReset()
    createOrder.mockReset()
    getProductById.mockImplementation((id) => Promise.resolve(currentProduct(Number(id))))
    createOrder.mockResolvedValue(confirmedOrder)
  })

  it('enables checkout from the cart after every item is reconciled', async () => {
    seedCart()
    renderApp('/cart')

    const checkoutButton = await screen.findByRole('button', { name: 'Proceed to checkout' })
    await waitFor(() => expect(checkoutButton).toBeEnabled())
  })

  it('keeps checkout disabled when a cart item needs attention', async () => {
    seedCart([storedItem(headphones)])
    getProductById.mockRejectedValue(new ProductNotFoundError('Not found'))
    renderApp('/cart')

    expect(await screen.findByText('This product is no longer available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
  })

  it('shows an empty state when checkout is opened without cart items', async () => {
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Your cart is empty.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Place order' })).not.toBeInTheDocument()
  })

  it('shows cart items, quantities, and the cents-safe total', async () => {
    seedCart()
    renderApp()

    await readyPlaceOrderButton()
    expect(screen.getByText('2 × $79.99')).toBeInTheDocument()
    expect(screen.getByText('1 × $49.99')).toBeInTheDocument()
    expect(screen.getByText('$209.97')).toBeInTheDocument()
  })

  it('sends only product IDs and quantities to Order Service', async () => {
    const user = userEvent.setup()
    seedCart()
    renderApp()

    await user.click(await readyPlaceOrderButton())

    await waitFor(() => expect(createOrder).toHaveBeenCalledWith([
      { productId: 2, quantity: 2 },
      { productId: 3, quantity: 1 },
    ]))
  })

  it('prevents duplicate Place Order submissions', async () => {
    let resolveOrder
    createOrder.mockReturnValue(new Promise((resolve) => {
      resolveOrder = resolve
    }))
    seedCart([storedItem(headphones)])
    renderApp()

    const button = await readyPlaceOrderButton()
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    resolveOrder({ ...confirmedOrder, items: [confirmedOrder.items[0]], totalAmount: 79.99 })
    await screen.findByRole('heading', { name: 'Order confirmed' })
  })

  it('clears the cart only after CONFIRMED and displays the backend response', async () => {
    const user = userEvent.setup()
    seedCart()
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByRole('heading', { name: 'Order confirmed' })).toBeInTheDocument()
    expect(screen.getByText('#17')).toBeInTheDocument()
    expect(screen.getByText('2 × Headphones')).toBeInTheDocument()
    expect(screen.getByText('$209.97')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart with 0 items' })).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))).toEqual([]))
  })

  it('keeps the cart and displays PAYMENT_FAILED', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones)])
    createOrder.mockResolvedValue({
      ...confirmedOrder,
      id: 18,
      items: [confirmedOrder.items[0]],
      totalAmount: 159.98,
      status: 'PAYMENT_FAILED',
    })
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByRole('heading', { name: 'Payment was not successful' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))).toHaveLength(1)
  })

  it('keeps the cart and warns against resubmission for INVENTORY_UPDATE_FAILED', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones)])
    createOrder.mockResolvedValue({
      ...confirmedOrder,
      id: 19,
      items: [confirmedOrder.items[0]],
      totalAmount: 159.98,
      status: 'INVENTORY_UPDATE_FAILED',
    })
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByRole('heading', { name: 'Inventory update needs attention' })).toBeInTheDocument()
    expect(screen.getByText(/Please do not place the order again/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()
  })

  it('keeps the cart after an ambiguous network failure and does not retry automatically', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones)])
    createOrder.mockRejectedValue(new AmbiguousOrderError('Network failed'))
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByText(/We could not confirm the order result/)).toBeInTheDocument()
    expect(createOrder).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /retry|check again/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()
  })

  it('prevents the POST when Product Service fails during final validation', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones)])
    getProductById
      .mockResolvedValueOnce(headphones)
      .mockRejectedValueOnce(new Error('Product Service unavailable'))
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByText(/Your order was not submitted/)).toBeInTheDocument()
    expect(createOrder).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument()
  })

  it('updates changed stock and waits for another review before submitting', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones, 2)])
    getProductById
      .mockResolvedValueOnce(headphones)
      .mockResolvedValueOnce({ ...headphones, stock: 1 })
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByText(/Your cart was updated/)).toBeInTheDocument()
    expect(screen.getByText('1 × $79.99')).toBeInTheDocument()
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('shows a safe message for an Order Service HTTP error and keeps the cart', async () => {
    const user = userEvent.setup()
    seedCart([storedItem(headphones)])
    createOrder.mockRejectedValue(new OrderServiceError('Insufficient stock', 400))
    renderApp()

    await user.click(await readyPlaceOrderButton())

    expect(await screen.findByText(/The order was not accepted. Insufficient stock/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()
  })

  it('blocks ordering when initial Product Service reconciliation fails', async () => {
    seedCart([storedItem(headphones)])
    getProductById.mockRejectedValue(new Error('Product Service unavailable'))
    renderApp()

    expect(await screen.findByText('Product availability could not be verified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('handles a direct order-result visit without route state', async () => {
    renderApp('/order-result')

    expect(await screen.findByRole('heading', { name: 'No recent order result is available.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/#catalog')
  })
})
