function ProductSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-card skeleton-card" key={index} aria-hidden="true">
          <div className="skeleton skeleton-image" />
          <div className="product-content">
            <div className="skeleton skeleton-label" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line skeleton-line-short" />
            <div className="skeleton skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProductSkeleton
