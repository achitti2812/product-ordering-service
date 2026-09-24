import { ShoppingBag } from 'lucide-react'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function ProductCard({ product }) {
  const isOutOfStock = product.stock <= 0

  function useFallbackImage(event) {
    event.currentTarget.onerror = null
    event.currentTarget.src = '/product-placeholder.svg'
  }

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          className="product-image"
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={useFallbackImage}
        />
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-content">
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-meta">
          <span className="product-price">{currency.format(product.price)}</span>
          <span className={`stock-status ${isOutOfStock ? 'stock-out' : ''}`}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
        <button
          className="add-to-cart"
          type="button"
          disabled
          title={isOutOfStock ? 'This product is out of stock' : 'Cart functionality arrives in Step 4'}
        >
          <ShoppingBag size={18} />
          {isOutOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
