import { ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'
import { showProductFallback } from '../utils/imageFallback.js'

function ProductCard({ product }) {
  const isOutOfStock = product.stock <= 0
  const { addToCart, getItemQuantity } = useCart()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}#catalog`
  const productLink = `/products/${product.id}`
  const cartQuantity = getItemQuantity(product.id)
  const atStockLimit = !isOutOfStock && cartQuantity >= product.stock

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={productLink} state={{ from: returnTo }} aria-label={`View ${product.name}`}>
          <img
            className="product-image"
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={showProductFallback}
          />
        </Link>
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-content">
        <h3>
          <Link className="product-name-link" to={productLink} state={{ from: returnTo }}>
            {product.name}
          </Link>
        </h3>
        <p className="product-description">{product.description}</p>
        <div className="product-meta">
          <span className="product-price">{formatCurrency(product.price)}</span>
          <span className={`stock-status ${isOutOfStock ? 'stock-out' : ''}`}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
        <button
          className="add-to-cart"
          type="button"
          aria-label={`Add ${product.name} to cart`}
          onClick={() => addToCart(product)}
          disabled={isOutOfStock || atStockLimit}
          title={isOutOfStock
            ? 'This product is out of stock'
            : atStockLimit
              ? 'Maximum available quantity is already in your cart'
              : `Add ${product.name} to cart`}
        >
          <ShoppingBag size={18} />
          {isOutOfStock
            ? 'Out of stock'
            : atStockLimit
              ? 'Stock limit reached'
              : cartQuantity > 0
                ? `Add another (${cartQuantity} in cart)`
                : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
