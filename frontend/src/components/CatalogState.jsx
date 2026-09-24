import { PackageOpen, RefreshCw, SearchX, WifiOff } from 'lucide-react'

function CatalogState({
  type,
  onRetry,
  search = '',
  category = '',
  onClearSearch,
  onViewAll,
}) {
  const isError = type === 'error'
  const hasFilters = Boolean(search || category)
  const Icon = isError ? WifiOff : hasFilters ? SearchX : PackageOpen

  let emptyMessage = 'The catalog is currently empty. Please check back soon.'

  if (search && category) {
    emptyMessage = `No products found for “${search}” in ${category}.`
  } else if (search) {
    emptyMessage = `No products found for “${search}”.`
  } else if (category) {
    emptyMessage = `No products found in ${category}.`
  }

  return (
    <div className="catalog-state" role={isError ? 'alert' : 'status'}>
      <span className="catalog-state-icon" aria-hidden="true">
        <Icon size={30} />
      </span>
      <h2>{isError ? "We couldn't load the products." : hasFilters ? 'No matching products' : 'No products to show yet.'}</h2>
      <p>
        {isError
          ? 'Make sure Product Service is running, then try again.'
          : emptyMessage}
      </p>
      {isError && (
        <button className="retry-button" type="button" onClick={onRetry}>
          <RefreshCw size={17} />
          Retry
        </button>
      )}
      {!isError && hasFilters && (
        <div className="catalog-state-actions">
          {search && (
            <button className="secondary-button" type="button" onClick={onClearSearch}>
              Clear search
            </button>
          )}
          <button className="retry-button" type="button" onClick={onViewAll}>
            View all products
          </button>
        </div>
      )}
    </div>
  )
}

export default CatalogState
