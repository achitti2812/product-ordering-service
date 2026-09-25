import { ArrowRight, Check, Package, ShieldCheck, Truck } from 'lucide-react'
import { showProductFallback } from '../utils/imageFallback.js'

function Hero({ products }) {
  return (
    <section className="hero page-shell" aria-labelledby="hero-heading">
      <div className="hero-content">
        <span className="eyebrow eyebrow-light">Thoughtfully selected essentials</span>
        <h1 id="hero-heading">Everyday finds, without the endless search.</h1>
        <p>
          Explore useful products across tech, style, home, books, and sport—all in one
          considered collection.
        </p>
        <a className="primary-cta" href="#catalog">
          Shop now
          <ArrowRight size={18} />
        </a>
        <ul className="hero-benefits" aria-label="Store benefits">
          <li><Check size={15} /> Curated catalog</li>
          <li><Check size={15} /> Clear availability</li>
        </ul>
      </div>

      <div className="hero-visual" aria-label="A selection of ReacSpi products">
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
        <div className="hero-product-stack">
          {products.length > 0 ? (
            products.slice(0, 3).map((product, index) => (
              <article className={`hero-product hero-product-${index + 1}`} key={product.id}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  decoding="async"
                  onError={showProductFallback}
                />
                <span>{product.name}</span>
              </article>
            ))
          ) : (
            <div className="hero-placeholder" aria-hidden="true">
              <Package size={70} strokeWidth={1.4} />
              <span>New finds arrive here</span>
            </div>
          )}
        </div>
        <div className="hero-trust-card">
          <ShieldCheck size={19} />
          <div>
            <strong>Shop with clarity</strong>
            <span>Live catalog and stock</span>
          </div>
        </div>
        <div className="hero-delivery-icon" aria-hidden="true">
          <Truck size={23} />
        </div>
      </div>
    </section>
  )
}

export default Hero
