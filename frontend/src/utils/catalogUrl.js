export function readCatalogFilters(searchParams) {
  return {
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
  }
}

export function buildCatalogSearch({ category = '', search = '' } = {}) {
  const query = new URLSearchParams()

  if (category.trim()) {
    query.set('category', category.trim())
  }

  if (search.trim()) {
    query.set('search', search.trim())
  }

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}
