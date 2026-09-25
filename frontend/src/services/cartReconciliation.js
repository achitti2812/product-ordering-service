import { getProductById, ProductNotFoundError } from './productService.js'

export async function reconcileCartItems(cartItems, { signal } = {}) {
  return Promise.all(cartItems.map(async (item) => {
    try {
      const product = await getProductById(item.id, { signal })
      return { item, product, status: 'success' }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error
      }

      if (error instanceof ProductNotFoundError) {
        return { item, status: 'not-found' }
      }

      return { item, error, status: 'error' }
    }
  }))
}
