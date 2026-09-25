import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { reconcileCartItems } from '../services/cartReconciliation.js'
import { getProductRefreshNotice, isCartReady } from '../utils/cartValidation.js'

export function useCartReconciliation() {
  const {
    cartItems,
    refreshCartProduct,
    markCartItemUnavailable,
  } = useCart()
  const [status, setStatus] = useState('idle')
  const [notices, setNotices] = useState({})
  const [retryVersion, setRetryVersion] = useState(0)
  const itemIds = useMemo(() => cartItems.map((item) => item.id).join(','), [cartItems])

  useEffect(() => {
    if (!itemIds) {
      setStatus('idle')
      setNotices({})
      return undefined
    }

    const controller = new AbortController()
    const itemsToRefresh = cartItems

    async function refreshProducts() {
      setStatus('loading')
      setNotices({})

      const results = await reconcileCartItems(itemsToRefresh, { signal: controller.signal })

      if (controller.signal.aborted) {
        return
      }

      const nextNotices = {}
      let hasRequestError = false

      results.forEach((result) => {
        if (result.status === 'success') {
          const notice = getProductRefreshNotice(result.item, result.product)

          if (notice) {
            nextNotices[result.item.id] = notice
          }

          refreshCartProduct(result.product)
        } else if (result.status === 'not-found') {
          markCartItemUnavailable(result.item.id)
          nextNotices[result.item.id] = 'Product Service no longer lists this item.'
        } else {
          hasRequestError = true
        }
      })

      setNotices(nextNotices)
      setStatus(hasRequestError ? 'error' : 'success')
    }

    refreshProducts().catch((error) => {
      if (error.name !== 'AbortError') {
        setStatus('error')
      }
    })

    return () => controller.abort()
  }, [itemIds, retryVersion, markCartItemUnavailable, refreshCartProduct])

  return {
    status,
    notices,
    canCheckout: status === 'success' && isCartReady(cartItems),
    retry: () => setRetryVersion((value) => value + 1),
  }
}
