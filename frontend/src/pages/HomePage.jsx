import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CatalogState from '../components/CatalogState.jsx'
import CategorySection from '../components/CategorySection.jsx'
import Hero from '../components/Hero.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import ProductSkeleton from '../components/ProductSkeleton.jsx'
import { getProducts } from '../services/productService.js'
import { buildCatalogSearch, readCatalogFilters } from '../utils/catalogUrl.js'

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

function getCatalogTitle(category, search) {
  if (category && search) {
    return `Results for “${search}” in ${category}`
  }

  if (search) {
    return `Search results for “${search}”`
  }

  if (category) {
    return `${category} products`
  }

  return 'Explore products'
}

function HomePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { category, search } = readCatalogFilters(searchParams)
  const [allProducts, setAllProducts] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)
  const fullCatalog = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      setIsLoading(true)
      setHasError(false)

      try {
        const filtersAreActive = Boolean(category || search)
        const fullCatalogRequest = fullCatalog.current
          ? Promise.resolve(fullCatalog.current)
          : getProducts({}, { signal: controller.signal })
        const catalogRequest = filtersAreActive
          ? getProducts({ category, search }, { signal: controller.signal })
          : fullCatalogRequest
        const [completeCatalog, filteredCatalog] = await Promise.all([
          fullCatalogRequest,
          catalogRequest,
        ])

        fullCatalog.current = completeCatalog
        setAllProducts(completeCatalog)
        setCatalogProducts(filteredCatalog)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCatalogProducts([])
          setHasError(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [category, search, retryVersion])

  function openCatalog(nextFilters) {
    navigate({
      pathname: '/',
      search: buildCatalogSearch(nextFilters),
      hash: 'catalog',
    })
  }

  function selectCategory(nextCategory) {
    openCatalog({ category: nextCategory, search })
  }

  function clearSearch() {
    openCatalog({ category })
  }

  function clearCategory() {
    openCatalog({ search })
  }

  function clearAllFilters() {
    openCatalog({})
  }

  const featuredProducts = selectFeaturedProducts(allProducts)
  const heroProducts = featuredProducts.slice(0, 3)
  const initialLoading = isLoading && allProducts.length === 0
  const filtersAreActive = Boolean(category || search)

  return (
    <>
      <Hero products={heroProducts} />
      <CategorySection activeCategory={category} onSelectCategory={selectCategory} />

      {initialLoading && (
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

      {!initialLoading && allProducts.length > 0 && (
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
      )}

      {!initialLoading && (
        <section id="catalog" className="section catalog-section page-shell" aria-labelledby="catalog-heading">
          <div className="section-heading catalog-heading">
            <div>
              <span className="eyebrow">The complete collection</span>
              <h2 id="catalog-heading">{getCatalogTitle(category, search)}</h2>
              {!isLoading && !hasError && (
                <p className="catalog-result-summary" role="status">
                  {catalogProducts.length} {catalogProducts.length === 1 ? 'product' : 'products'} found
                </p>
              )}
            </div>
            {!isLoading && !hasError && (
              <span className="product-count">{catalogProducts.length} products</span>
            )}
          </div>

          {filtersAreActive && (
            <div className="active-filters" aria-label="Active product filters">
              <span className="active-filters-label">Active filters</span>
              {category && (
                <button type="button" onClick={clearCategory} aria-label={`Remove ${category} filter`}>
                  {category}<X size={14} />
                </button>
              )}
              {search && (
                <button type="button" onClick={clearSearch} aria-label={`Remove ${search} search`}>
                  “{search}”<X size={14} />
                </button>
              )}
              {category && search && (
                <button className="clear-all-filters" type="button" onClick={clearAllFilters}>
                  Clear all
                </button>
              )}
            </div>
          )}

          {isLoading && <ProductSkeleton count={8} />}
          {!isLoading && hasError && (
            <CatalogState type="error" onRetry={() => setRetryVersion((value) => value + 1)} />
          )}
          {!isLoading && !hasError && catalogProducts.length === 0 && (
            <CatalogState
              type="empty"
              search={search}
              category={category}
              onClearSearch={clearSearch}
              onViewAll={clearAllFilters}
            />
          )}
          {!isLoading && !hasError && catalogProducts.length > 0 && (
            <ProductGrid products={catalogProducts} />
          )}
        </section>
      )}
    </>
  )
}

export default HomePage
