import {
  CircleUserRound,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'

const categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports']

function Header() {
  return (
    <header className="site-header">
      <div className="header-main page-shell">
        <a className="brand" href="#top" aria-label="ReacSpi home">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <span>ReacSpi</span>
        </a>

        <label className="search-field" title="Product search will be available in Step 3">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Search products, coming in Step 3</span>
          <input type="search" placeholder="Search products..." disabled />
          <span className="coming-soon">Coming soon</span>
        </label>

        <nav className="header-actions" aria-label="Account and shopping links">
          <button className="header-action" type="button" disabled title="Accounts are not available yet">
            <CircleUserRound size={21} />
            <span>Account</span>
          </button>
          <button className="header-action" type="button" disabled title="Order history will be added later">
            <PackageCheck size={21} />
            <span>Orders</span>
          </button>
          <button className="header-action cart-action" type="button" disabled title="Cart functionality arrives in Step 4">
            <span className="cart-icon-wrap">
              <ShoppingBag size={21} />
              <span className="cart-count" aria-label="0 items in cart">0</span>
            </span>
            <span>Cart</span>
          </button>
        </nav>
      </div>

      <nav className="category-nav" aria-label="Product categories">
        <div className="category-nav-inner page-shell">
          <span className="category-nav-label">Browse</span>
          {categories.map((category) => (
            <span className="category-nav-item" key={category}>
              {category}
            </span>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
