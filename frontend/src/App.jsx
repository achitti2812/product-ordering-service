import { useEffect, useState } from 'react'
import CatalogState from './components/CatalogState.jsx'
import CategorySection from './components/CategorySection.jsx'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import ProductGrid from './components/ProductGrid.jsx'
import ProductSkeleton from './components/ProductSkeleton.jsx'
import { getProducts } from './services/productService.js'

function selectFeaturedProducts(products) {
  const seenCategories = new Set()

  return products
    .filter((product) => {
      if (seenCategories.has(product.category)) {
        return false
      }

      seenCategories.add(product.category)
      return true
    })
    .slice(0, 4)
}

function App() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  async function loadProducts() {
    setIsLoading(true)
    setHasError(false)

    try {
      const productData = await getProducts()
      setProducts(productData)
    } catch {
      setProducts([])
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const featuredProducts = selectFeaturedProducts(products)
  const heroProducts = featuredProducts.slice(0, 3)

  return (
    <div id="top" className="app">
      <Header />
      <main>
        <Hero products={heroProducts} />
        <CategorySection />

        {isLoading && (
          <>
            <section className="section page-shell" aria-labelledby="featured-loading-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">A few favorites</span>
                  <h2 id="featured-loading-heading">Featured products</h2>
                </div>
              </div>
              <ProductSkeleton count={4} />
            </section>
            <section id="catalog" className="section catalog-section page-shell" aria-labelledby="catalog-loading-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">The complete collection</span>
                  <h2 id="catalog-loading-heading">Explore products</h2>
                </div>
              </div>
              <ProductSkeleton count={8} />
            </section>
          </>
        )}

        {!isLoading && hasError && (
          <section id="catalog" className="section page-shell">
            <CatalogState type="error" onRetry={loadProducts} />
          </section>
        )}

        {!isLoading && !hasError && products.length === 0 && (
          <section id="catalog" className="section page-shell">
            <CatalogState type="empty" />
          </section>
        )}

        {!isLoading && !hasError && products.length > 0 && (
          <>
            <section className="section featured-section page-shell" aria-labelledby="featured-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">A few favorites</span>
                  <h2 id="featured-heading">Featured products</h2>
                </div>
                <p>A simple selection featuring different parts of the catalog.</p>
              </div>
              <ProductGrid products={featuredProducts} compact />
            </section>

            <section id="catalog" className="section catalog-section page-shell" aria-labelledby="catalog-heading">
              <div className="section-heading catalog-heading">
                <div>
                  <span className="eyebrow">The complete collection</span>
                  <h2 id="catalog-heading">Explore products</h2>
                </div>
                <span className="product-count">{products.length} products</span>
              </div>
              <ProductGrid products={products} />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
