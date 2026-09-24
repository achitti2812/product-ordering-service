import ProductCard from './ProductCard.jsx'

function ProductGrid({ products, compact = false }) {
  return (
    <div className={`product-grid ${compact ? 'product-grid-compact' : ''}`}>
      {products.map((product) => (
        <ProductCard product={product} key={product.id} />
      ))}
    </div>
  )
}

export default ProductGrid
