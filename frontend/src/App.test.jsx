import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
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
    id: 1,
    name: 'Laptop',
    description: 'Powerful laptop for work and study.',
    category: 'Electronics',
    price: 999.99,
    stock: 10,
    imageUrl: 'https://example.com/laptop.jpg',
  },
  {
    id: 2,
    name: 'Headphones',
    description: 'Wireless noise-isolating headphones.',
    category: 'Electronics',
    price: 79.99,
    stock: 25,
    imageUrl: 'https://example.com/headphones.jpg',
  },
  {
    id: 11,
    name: "Men's T-Shirt",
    description: 'Soft cotton shirt for everyday wear.',
    category: 'Fashion',
    price: 19.99,
    stock: 60,
    imageUrl: 'https://example.com/shirt.jpg',
  },
  {
    id: 21,
    name: 'Coffee Maker',
    description: 'Programmable coffee maker.',
    category: 'Home & Kitchen',
    price: 79.99,
    stock: 22,
    imageUrl: 'https://example.com/coffee.jpg',
  },
  {
    id: 31,
    name: 'Java Programming',
    description: 'A beginner-friendly Java guide.',
    category: 'Books',
    price: 44.99,
    stock: 40,
    imageUrl: 'https://example.com/java.jpg',
  },
]

function matchingProducts({ category = '', search = '' } = {}) {
  const searchTerm = search.toLowerCase()

  return products.filter((product) => {
    const matchesCategory = !category || product.category === category
    const matchesSearch = !searchTerm
      || product.name.toLowerCase().includes(searchTerm)
      || product.description.toLowerCase().includes(searchTerm)
    return matchesCategory && matchesSearch
  })
}

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )
}

describe('catalog browsing', () => {
  beforeEach(() => {
    getProducts.mockReset()
    getProductById.mockReset()
    getProducts.mockImplementation((filters) => Promise.resolve(matchingProducts(filters)))
    getProductById.mockImplementation((id) => (
      Promise.resolve(products.find((product) => String(product.id) === String(id)))
    ))
  })

  it('submits a search and clears it without requesting on every keystroke', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('5 products found')
    const initialCallCount = getProducts.mock.calls.length
    const searchInput = screen.getByRole('searchbox', { name: 'Search products' })

    await user.type(searchInput, 'laptop')
    expect(getProducts).toHaveBeenCalledTimes(initialCallCount)

    await user.keyboard('{Enter}')
    await screen.findByRole('heading', { name: 'Search results for “laptop”' })
    await waitFor(() => {
      expect(getProducts).toHaveBeenLastCalledWith(
        { category: '', search: 'laptop' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    await user.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1))
    await screen.findByRole('heading', { name: 'Explore products' })
    expect(searchInput).toHaveValue('')
  })

  it('selects a category and combines it with the submitted search', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('5 products found')
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'wireless')
    await user.keyboard('{Enter}')
    await user.click(screen.getAllByRole('button', { name: 'Electronics' })[0])

    await screen.findByRole('heading', { name: 'Results for “wireless” in Electronics' })
    await waitFor(() => {
      expect(getProducts).toHaveBeenLastCalledWith(
        { category: 'Electronics', search: 'wireless' },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })
    expect(screen.getByText('1 product found')).toBeInTheDocument()
  })

  it('clears category and search filters independently', async () => {
    const user = userEvent.setup()
    renderApp('/?category=Electronics&search=wireless')

    await screen.findByRole('heading', { name: 'Results for “wireless” in Electronics' })
    await user.click(screen.getByRole('button', { name: 'Remove Electronics filter' }))

    await screen.findByRole('heading', { name: 'Search results for “wireless”' })
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('wireless')

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await screen.findByRole('heading', { name: 'Explore products' })
  })

  it('shows useful actions when combined filters have no results', async () => {
    const user = userEvent.setup()
    renderApp('/?category=Books&search=wireless')

    expect(await screen.findByText('No products found for “wireless” in Books.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View all products' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1))
    expect(await screen.findByRole('heading', { name: 'Books products' })).toBeInTheDocument()
    expect(screen.getByText('1 product found')).toBeInTheDocument()
  })

  it('navigates from a product card to freshly fetched product details', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('5 products found')
    await user.click(screen.getAllByRole('link', { name: 'Laptop' })[0])

    await screen.findByRole('heading', { name: 'Laptop' })
    expect(getProductById).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByText('$999.99')).toBeInTheDocument()
  })
})

describe('product details states', () => {
  beforeEach(() => {
    getProducts.mockReset()
    getProductById.mockReset()
  })

  it('shows a loading state before product details arrive', async () => {
    let resolveProduct
    getProductById.mockReturnValue(new Promise((resolve) => {
      resolveProduct = resolve
    }))
    renderApp('/products/1')

    expect(screen.getByLabelText('Loading product details')).toBeInTheDocument()

    await act(async () => {
      resolveProduct(products[0])
    })
    expect(await screen.findByRole('heading', { name: 'Laptop' })).toBeInTheDocument()
  })

  it('shows Product not found for a 404 response', async () => {
    getProductById.mockRejectedValue(new ProductNotFoundError('Product not found'))
    renderApp('/products/999')

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/#catalog')
  })

  it('retries a failed product details request', async () => {
    const user = userEvent.setup()
    getProductById
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(products[1])
    renderApp('/products/2')

    expect(await screen.findByRole('heading', { name: "We couldn't load this product." })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Headphones' })).toBeInTheDocument()
    expect(getProductById).toHaveBeenCalledTimes(2)
  })

  it('shows an API error and retries successfully', async () => {
    const user = userEvent.setup()
    getProducts
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(products)
    renderApp()

    expect(await screen.findByText("We couldn't load the products.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('5 products found')).toBeInTheDocument()
    expect(getProducts).toHaveBeenCalledTimes(2)
  })
})
