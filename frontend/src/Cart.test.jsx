import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { CART_STORAGE_KEY } from './context/CartContext.jsx'
import {
  getProductById,
  getProducts,
  ProductNotFoundError,
} from './services/productService.js'

vi.mock('./services/productService.js', () => {
  class MockProductNotFoundError extends Error {}

  return {
    getProducts: vi.fn(),
    getProductById: vi.fn(),
    ProductNotFoundError: MockProductNotFoundError,
  }
})

const products = [
  {
    id: 2,
    name: 'Headphones',
    description: 'Wireless headphones for focused listening.',
    category: 'Electronics',
    price: 79.99,
    stock: 25,
    imageUrl: 'https://example.com/headphones.jpg',
  },
  {
    id: 6,
    name: 'Keyboard',
    description: 'A comfortable mechanical keyboard.',
    category: 'Electronics',
    price: 49.99,
    stock: 40,
    imageUrl: 'https://example.com/keyboard.jpg',
  },
  {
    id: 40,
    name: 'Limited Book',
    description: 'A small print run.',
    category: 'Books',
    price: 12.5,
    stock: 2,
    imageUrl: 'https://example.com/book.jpg',
  },
  {
    id: 50,
    name: 'Sold Out Bands',
    description: 'Resistance bands awaiting new stock.',
    category: 'Sports',
    price: 18,
    stock: 0,
    imageUrl: 'https://example.com/bands.jpg',
  },
]

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

function storedItem(product, overrides = {}) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    stock: product.stock,
    quantity: 1,
    isAvailable: true,
    ...overrides,
  }
}

async function addProduct(user, productName, times = 1) {
  const buttons = await screen.findAllByRole('button', { name: `Add ${productName} to cart` })
  const button = buttons.at(-1)

  for (let count = 0; count < times; count += 1) {
    await user.click(button)
  }
}

describe('shopping cart', () => {
  beforeEach(() => {
    getProducts.mockReset()
    getProductById.mockReset()
    getProducts.mockResolvedValue(products)
    getProductById.mockImplementation((id) => (
      Promise.resolve(products.find((product) => product.id === Number(id)))
    ))
  })

  it('adds products, combines duplicate items, updates the badge, and persists the cart', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('4 products found')
    await addProduct(user, 'Headphones', 2)
    await addProduct(user, 'Keyboard')

    expect(screen.getByRole('link', { name: 'Cart with 3 items' })).toBeInTheDocument()
    await waitFor(() => {
      const savedCart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))
      expect(savedCart).toHaveLength(2)
      expect(savedCart.find((item) => item.id === 2).quantity).toBe(2)
      expect(savedCart.find((item) => item.id === 6).quantity).toBe(1)
    })
  })

  it('prevents additions above stock and disables out-of-stock products', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('4 products found')
    await addProduct(user, 'Limited Book', 2)

    expect(screen.getAllByRole('button', { name: 'Add Limited Book to cart' }).at(-1)).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Add Sold Out Bands to cart' }).at(-1)).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Cart with 2 items' })).toBeInTheDocument()
  })

  it('uses the same shared cart when adding from product details', async () => {
    const user = userEvent.setup()
    renderApp('/products/2')

    expect(await screen.findByRole('heading', { name: 'Headphones' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add Headphones to cart' }))

    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()
    expect(screen.getByText('1 unit currently in your cart.')).toBeInTheDocument()
  })

  it('updates quantities and calculates item and cart subtotals in cents', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('4 products found')
    await addProduct(user, 'Headphones', 2)
    await addProduct(user, 'Keyboard')
    await user.click(screen.getByRole('link', { name: 'Cart with 3 items' }))

    expect(await screen.findByRole('heading', { name: 'Shopping cart' })).toBeInTheDocument()
    expect(screen.getByText('$159.98')).toBeInTheDocument()
    expect(screen.getByText('$49.99')).toBeInTheDocument()
    expect(screen.getByText('$209.97')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease Keyboard quantity' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Increase Headphones quantity' }))
    expect(screen.getByText('$239.97')).toBeInTheDocument()
    expect(screen.getByText('$289.96')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Decrease Headphones quantity' }))
    expect(screen.getByText('$209.97')).toBeInTheDocument()
  })

  it('removes individual items and clears the whole cart after confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()

    await screen.findByText('4 products found')
    await addProduct(user, 'Headphones')
    await addProduct(user, 'Keyboard')
    await user.click(screen.getByRole('link', { name: 'Cart with 2 items' }))

    await screen.findByRole('heading', { name: 'Shopping cart' })
    await user.click(screen.getByRole('button', { name: 'Remove Keyboard from cart' }))
    expect(screen.getByRole('link', { name: 'Cart with 1 item' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear cart' }))
    expect(confirm).toHaveBeenCalledWith('Remove all items from your cart?')
    expect(await screen.findByRole('heading', { name: 'Your cart is empty.' })).toBeInTheDocument()
  })

  it('restores a valid stored cart and handles malformed localStorage safely', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([storedItem(products[0], { quantity: 2 })]),
    )
    const firstRender = renderApp()

    expect(screen.getByRole('link', { name: 'Cart with 2 items' })).toBeInTheDocument()
    firstRender.unmount()

    window.localStorage.setItem(CART_STORAGE_KEY, '{not valid json')
    renderApp('/cart')
    expect(await screen.findByRole('heading', { name: 'Your cart is empty.' })).toBeInTheDocument()
  })

  it('refreshes price and stock, then clamps a stored quantity to current inventory', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([storedItem(products[2], { price: 10, stock: 8, quantity: 3 })]),
    )
    renderApp('/cart')

    expect(await screen.findByText('Quantity adjusted to the current stock of 2.')).toBeInTheDocument()
    expect(screen.getAllByText('$25.00')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Cart with 2 items' })).toBeInTheDocument()
    expect(getProductById).toHaveBeenCalledWith(
      40,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('keeps an unavailable product visible with an explanation', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([storedItem(products[0])]),
    )
    getProductById.mockRejectedValue(new ProductNotFoundError('Product not found'))
    renderApp('/cart')

    expect(await screen.findByText('This product is no longer available.')).toBeInTheDocument()
    expect(screen.getByText('Product Service no longer lists this item.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Headphones' })).toBeInTheDocument()
  })

  it('shows a refresh warning and retries when Product Service is unavailable', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([storedItem(products[0])]),
    )
    getProductById
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(products[0])
    renderApp('/cart')

    expect(await screen.findByText("We couldn't refresh every item. Stored prices and stock may be out of date.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(getProductById).toHaveBeenCalledTimes(2))
    await waitFor(() => {
      expect(screen.queryByText("We couldn't refresh every item. Stored prices and stock may be out of date.")).not.toBeInTheDocument()
    })
  })

  it('shows a useful empty-cart state', async () => {
    renderApp('/cart')

    expect(await screen.findByRole('heading', { name: 'Your cart is empty.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/#catalog')
  })
})
