import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export const CART_STORAGE_KEY = 'reacspi-cart-v1'

const CartContext = createContext(null)

function normalizeStock(stock) {
  const numericStock = Number(stock)
  return Number.isFinite(numericStock) ? Math.max(0, Math.floor(numericStock)) : 0
}

function createCartItem(product, quantity = 1) {
  const stock = normalizeStock(product.stock)

  return {
    id: Number(product.id),
    name: product.name,
    category: product.category || '',
    price: Number(product.price),
    imageUrl: product.imageUrl || '',
    stock,
    quantity: stock > 0 ? Math.min(Math.max(1, Math.floor(quantity)), stock) : Math.max(1, Math.floor(quantity)),
    isAvailable: product.isAvailable !== false,
  }
}

function isValidStoredItem(item) {
  return item
    && Number.isFinite(Number(item.id))
    && typeof item.name === 'string'
    && item.name.trim()
    && Number.isFinite(Number(item.price))
    && Number(item.price) >= 0
    && Number.isFinite(Number(item.stock))
    && Number.isFinite(Number(item.quantity))
    && Number(item.quantity) >= 1
}

function readStoredCart() {
  try {
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsedValue = JSON.parse(storedValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter(isValidStoredItem)
      .map((item) => createCartItem(item, item.quantity))
  } catch {
    return []
  }
}

function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    } catch {
      // The cart still works for this session if browser storage is unavailable.
    }
  }, [cartItems])

  const addToCart = useCallback((product) => {
    const stock = normalizeStock(product.stock)

    if (stock === 0) {
      return
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (!existingItem) {
        return [...currentItems, createCartItem(product)]
      }

      if (existingItem.quantity >= stock) {
        return currentItems
      }

      return currentItems.map((item) => (
        item.id === product.id
          ? createCartItem(product, item.quantity + 1)
          : item
      ))
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    setCartItems((currentItems) => currentItems.map((item) => {
      if (item.id !== productId || item.isAvailable === false || item.stock <= 0) {
        return item
      }

      const nextQuantity = Math.min(
        Math.max(1, Math.floor(quantity)),
        item.stock,
      )

      return { ...item, quantity: nextQuantity }
    }))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const refreshCartProduct = useCallback((product) => {
    setCartItems((currentItems) => currentItems.map((item) => (
      item.id === product.id
        ? createCartItem(product, item.quantity)
        : item
    )))
  }, [])

  const markCartItemUnavailable = useCallback((productId) => {
    setCartItems((currentItems) => currentItems.map((item) => (
      item.id === productId
        ? { ...item, isAvailable: false }
        : item
    )))
  }, [])

  const getItemQuantity = useCallback((productId) => (
    cartItems.find((item) => item.id === productId)?.quantity || 0
  ), [cartItems])

  const cartItemCount = useMemo(() => (
    cartItems.reduce((total, item) => total + item.quantity, 0)
  ), [cartItems])

  const cartSubtotalCents = useMemo(() => (
    cartItems.reduce(
      (total, item) => total + (Math.round(item.price * 100) * item.quantity),
      0,
    )
  ), [cartItems])

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCartProduct,
    markCartItemUnavailable,
    getItemQuantity,
    cartItemCount,
    cartSubtotal: cartSubtotalCents / 100,
    cartSubtotalCents,
  }), [
    addToCart,
    cartItemCount,
    cartItems,
    cartSubtotalCents,
    clearCart,
    getItemQuantity,
    markCartItemUnavailable,
    refreshCartProduct,
    removeFromCart,
    updateQuantity,
  ])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside CartProvider')
  }

  return context
}

export { CartProvider, useCart }
