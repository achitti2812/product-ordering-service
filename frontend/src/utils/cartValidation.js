export function getCartItemIssue(item) {
  if (!Number.isInteger(Number(item.id)) || Number(item.id) <= 0) {
    return 'This cart item has an invalid product ID.'
  }

  if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
    return 'This cart item has an invalid quantity.'
  }

  if (item.isAvailable === false) {
    return 'This product is no longer available.'
  }

  if (!Number.isFinite(Number(item.stock)) || Number(item.stock) <= 0) {
    return 'This product is currently out of stock.'
  }

  if (Number(item.quantity) > Number(item.stock)) {
    return `Only ${item.stock} units are currently available.`
  }

  return ''
}

export function isCartReady(cartItems) {
  return cartItems.length > 0 && cartItems.every((item) => !getCartItemIssue(item))
}

export function productInformationChanged(item, product) {
  return Number(item.price) !== Number(product.price)
    || Number(item.stock) !== Number(product.stock)
    || item.isAvailable === false
}

export function getProductRefreshNotice(item, product) {
  if (Number(product.stock) === 0) {
    return 'Current inventory shows this item is out of stock.'
  }

  if (Number(item.quantity) > Number(product.stock)) {
    return `Quantity adjusted to the current stock of ${product.stock}.`
  }

  if (Number(item.price) !== Number(product.price)) {
    return 'Price updated using the latest product information.'
  }

  if (Number(item.stock) !== Number(product.stock)) {
    return `Available stock updated to ${product.stock}.`
  }

  return ''
}
