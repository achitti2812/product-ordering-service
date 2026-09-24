export function showProductFallback(event) {
  event.currentTarget.onerror = null
  event.currentTarget.src = '/product-placeholder.svg'
}
