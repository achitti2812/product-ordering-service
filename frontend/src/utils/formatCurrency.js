const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(value) {
  return currency.format(value)
}
