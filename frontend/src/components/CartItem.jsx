import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'
import { showProductFallback } from '../utils/imageFallback.js'

function CartItem({ item, notice }) {
  const { removeFromCart, updateQuantity } = useCart()
  const isUnavailable = item.isAvailable === false
  const isOutOfStock = item.stock <= 0
  const atStockLimit = !isUnavailable && !isOutOfStock && item.quantity >= item.stock
  const itemSubtotal = (Math.round(item.price * 100) * item.quantity) / 100
  const productLinkState = { from: '/cart', backLabel: 'Back to cart' }

  return (
    <article className={`cart-item ${isUnavailable || isOutOfStock ? 'cart-item-attention' : ''}`}>
      <Link
        className="cart-item-image"
        to={`/products/${item.id}`}
        state={productLinkState}
        aria-label={`View ${item.name}`}
      >
        <img src={item.imageUrl} alt={item.name} onError={showProductFallback} />
      </Link>

      <div className="cart-item-info">
        <span className="cart-item-category">{item.category}</span>
        <h2>
          <Link to={`/products/${item.id}`} state={productLinkState}>{item.name}</Link>
        </h2>
        <span className="cart-item-unit-price">{formatCurrency(item.price)} each</span>

        <div className="cart-quantity" aria-label={`${item.name} quantity controls`}>
          <button
            type="button"
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1 || isUnavailable || isOutOfStock}
            aria-label={`Decrease ${item.name} quantity`}
          >
            <Minus size={16} />
          </button>
          <span aria-live="polite">{item.quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={atStockLimit || isUnavailable || isOutOfStock}
            aria-label={`Increase ${item.name} quantity`}
          >
            <Plus size={16} />
          </button>
        </div>

        {isUnavailable && <p className="cart-item-warning">This product is no longer available.</p>}
        {!isUnavailable && isOutOfStock && <p className="cart-item-warning">This product is currently out of stock.</p>}
        {atStockLimit && <p className="cart-item-limit">Maximum available quantity reached.</p>}
        {notice && <p className="cart-item-notice">{notice}</p>}
      </div>

      <div className="cart-item-total">
        <span>Item subtotal</span>
        <strong>{formatCurrency(itemSubtotal)}</strong>
        <button
          className="remove-cart-item"
          type="button"
          onClick={() => removeFromCart(item.id)}
          aria-label={`Remove ${item.name} from cart`}
        >
          <Trash2 size={16} />
          Remove
        </button>
      </div>
    </article>
  )
}

export default CartItem
