const productApiUrl = (
  import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:8080'
).replace(/\/$/, '')

export class ProductNotFoundError extends Error {}

export async function getProducts({ category = '', search = '' } = {}, { signal } = {}) {
  const query = new URLSearchParams()

  if (category.trim()) {
    query.set('category', category.trim())
  }

  if (search.trim()) {
    query.set('search', search.trim())
  }

  const queryString = query.toString()
  const url = `${productApiUrl}/products${queryString ? `?${queryString}` : ''}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error('Product request failed')
  }

  const products = await response.json()

  if (!Array.isArray(products)) {
    throw new Error('Unexpected product response')
  }

  return products
}

export async function getProductById(productId, { signal } = {}) {
  const response = await fetch(
    `${productApiUrl}/products/${encodeURIComponent(productId)}`,
    { signal },
  )

  if (response.status === 404) {
    throw new ProductNotFoundError('Product not found')
  }

  if (!response.ok) {
    throw new Error('Product request failed')
  }

  return response.json()
}
