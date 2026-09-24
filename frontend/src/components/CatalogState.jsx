import { PackageOpen, RefreshCw, WifiOff } from 'lucide-react'

function CatalogState({ type, onRetry }) {
  const isError = type === 'error'
  const Icon = isError ? WifiOff : PackageOpen

  return (
    <div className="catalog-state" role={isError ? 'alert' : 'status'}>
      <span className="catalog-state-icon" aria-hidden="true">
        <Icon size={30} />
      </span>
      <h2>{isError ? "We couldn't load the products." : 'No products to show yet.'}</h2>
      <p>
        {isError
          ? 'Make sure Product Service is running, then try again.'
          : 'The catalog is currently empty. Please check back soon.'}
      </p>
      {isError && (
        <button className="retry-button" type="button" onClick={onRetry}>
          <RefreshCw size={17} />
          Retry
        </button>
      )}
    </div>
  )
}

export default CatalogState
