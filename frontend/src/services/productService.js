const productApiUrl = (
  import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:8080'
).replace(/\/$/, '')

export async function getProducts() {
  const response = await fetch(`${productApiUrl}/products`)

  if (!response.ok) {
    throw new Error('Product request failed')
  }

  const products = await response.json()

  if (!Array.isArray(products)) {
    throw new Error('Unexpected product response')
  }

  return products
}
