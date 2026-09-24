import { useEffect, useState } from 'react'
import { ArrowLeft, PackageOpen, RefreshCw, ShoppingBag, WifiOff } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { getProductById, ProductNotFoundError } from '../services/productService.js'
import { buildCatalogSearch } from '../utils/catalogUrl.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { showProductFallback } from '../utils/imageFallback.js'

function ProductDetailsPage() {
  const { productId } = useParams()
  const location = useLocation()
  const { addToCart, getItemQuantity } = useCart()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [retryVersion, setRetryVersion] = useState(0)
  const backTo = location.state?.from || '/#catalog'
  const backLabel = location.state?.backLabel || 'Back to products'

  useEffect(() => {
    const controller = new AbortController()

    async function loadProduct() {
      setStatus('loading')

      try {
        const productData = await getProductById(productId, { signal: controller.signal })
        setProduct(productData)
        setStatus('success')
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setProduct(null)
        setStatus(error instanceof ProductNotFoundError ? 'not-found' : 'error')
      }
    }

    loadProduct()
    return () => controller.abort()
  }, [productId, retryVersion])

  if (status === 'loading') {
    return (
      <main className="product-details-page page-shell" aria-label="Loading product details" aria-busy="true">
        <div className="details-skeleton">
          <div className="skeleton details-skeleton-image" />
          <div className="details-skeleton-content">
            <div className="skeleton skeleton-label" />
            <div className="skeleton details-skeleton-title" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line skeleton-line-short" />
            <div className="skeleton skeleton-button" />
          </div>
        </div>
      </main>
    )
  }

  if (status === 'not-found') {
    return (
      <main className="product-details-page page-shell">
        <div className="details-state" role="status">
          <span className="catalog-state-icon" aria-hidden="true"><PackageOpen size={30} /></span>
          <h1>Product not found</h1>
          <p>The product may have been removed or the address may be incorrect.</p>
          <Link className="retry-button" to="/#catalog">
            <ArrowLeft size={17} />
            Back to products
          </Link>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="product-details-page page-shell">
        <div className="details-state" role="alert">
          <span className="catalog-state-icon" aria-hidden="true"><WifiOff size={30} /></span>
          <h1>We couldn't load this product.</h1>
          <p>Make sure Product Service is running, then try again.</p>
          <button className="retry-button" type="button" onClick={() => setRetryVersion((value) => value + 1)}>
            <RefreshCw size={17} />
            Retry
          </button>
        </div>
      </main>
    )
  }

  const isOutOfStock = product.stock <= 0
  const cartQuantity = getItemQuantity(product.id)
  const atStockLimit = !isOutOfStock && cartQuantity >= product.stock
  const categoryUrl = `/${buildCatalogSearch({ category: product.category })}#catalog`

  return (
    <main className="product-details-page page-shell">
      <Link className="back-link" to={backTo}>
        <ArrowLeft size={17} />
        {backLabel}
      </Link>

      <article className="product-details">
        <div className="product-details-image-wrap">
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={showProductFallback}
          />
        </div>

        <div className="product-details-content">
          <Link className="details-category" to={categoryUrl}>
            {product.category}
          </Link>
          <h1>{product.name}</h1>
          <p className="details-description">{product.description}</p>
          <div className="details-price">{formatCurrency(product.price)}</div>
          <div className={`details-stock ${isOutOfStock ? 'stock-out' : ''}`}>
            <strong>{isOutOfStock ? 'Currently out of stock' : 'In stock'}</strong>
            <span>
              {isOutOfStock
                ? 'Please check back later.'
                : `${product.stock} units currently available`}
            </span>
          </div>
          <button
            className="add-to-cart details-cart-button"
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
            <ShoppingBag size={19} />
            {isOutOfStock
              ? 'Out of stock'
              : atStockLimit
                ? 'Stock limit reached'
                : cartQuantity > 0
                  ? `Add another (${cartQuantity} in cart)`
                  : 'Add to cart'}
          </button>
          {cartQuantity > 0 && !atStockLimit && (
            <p className="cart-feedback" role="status">
              {cartQuantity} {cartQuantity === 1 ? 'unit' : 'units'} currently in your cart.
            </p>
          )}
        </div>
      </article>
    </main>
  )
}

export default ProductDetailsPage
