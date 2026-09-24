import { useEffect, useState } from 'react'
import {
  CircleUserRound,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '../constants/catalog.js'
import { useCart } from '../context/CartContext.jsx'
import { buildCatalogSearch, readCatalogFilters } from '../utils/catalogUrl.js'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartItemCount } = useCart()
  const isHomePage = location.pathname === '/'
  const currentFilters = isHomePage
    ? readCatalogFilters(new URLSearchParams(location.search))
    : { category: '', search: '' }
  const [searchInput, setSearchInput] = useState(currentFilters.search)

  useEffect(() => {
    setSearchInput(currentFilters.search)
  }, [currentFilters.search])

  function openCatalog(filters) {
    navigate({
      pathname: '/',
      search: buildCatalogSearch(filters),
      hash: 'catalog',
    })
  }

  function submitSearch(event) {
    event.preventDefault()
    openCatalog({
      category: currentFilters.category,
      search: searchInput,
    })
  }

  function clearSearch() {
    setSearchInput('')
    openCatalog({ category: currentFilters.category })
  }

  function selectCategory(category) {
    openCatalog({
      category,
      search: currentFilters.search,
    })
  }

  return (
    <header className="site-header">
      <div className="header-main page-shell">
        <Link className="brand" to="/" aria-label="ReacSpi home">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <span>ReacSpi</span>
        </Link>

        <form className="search-field" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="product-search">Search products</label>
          <input
            id="product-search"
            type="search"
            value={searchInput}
            placeholder="Search products..."
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {searchInput && (
            <button
              className="search-clear"
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
          <button className="search-submit" type="submit" aria-label="Search products">
            <Search size={19} aria-hidden="true" />
          </button>
        </form>

        <nav className="header-actions" aria-label="Account and shopping links">
          <button className="header-action" type="button" disabled title="Accounts are not available yet">
            <CircleUserRound size={21} />
            <span>Account</span>
          </button>
          <button className="header-action" type="button" disabled title="Order history will be added later">
            <PackageCheck size={21} />
            <span>Orders</span>
          </button>
          <Link
            className="header-action cart-action"
            to="/cart"
            aria-label={`Cart with ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`}
          >
            <span className="cart-icon-wrap">
              <ShoppingBag size={21} />
              <span className="cart-count" aria-hidden="true">{cartItemCount}</span>
            </span>
            <span>Cart</span>
          </Link>
        </nav>
      </div>

      <nav className="category-nav" aria-label="Product categories">
        <div className="category-nav-inner page-shell">
          <span className="category-nav-label">Browse</span>
          <button
            className={`category-nav-item ${isHomePage && !currentFilters.category ? 'category-nav-item-active' : ''}`}
            type="button"
            onClick={() => selectCategory('')}
            aria-pressed={isHomePage && !currentFilters.category}
          >
            All Products
          </button>
          {PRODUCT_CATEGORIES.map((category) => (
            <button
              className={`category-nav-item ${isHomePage && currentFilters.category === category ? 'category-nav-item-active' : ''}`}
              type="button"
              onClick={() => selectCategory(category)}
              aria-pressed={isHomePage && currentFilters.category === category}
              key={category}
            >
              {category}
            </button>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
