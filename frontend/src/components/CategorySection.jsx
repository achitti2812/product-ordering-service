import { BookOpen, CookingPot, Dumbbell, Laptop, Shirt } from 'lucide-react'

const categories = [
  {
    name: 'Electronics',
    note: 'Smart tools for daily life',
    icon: Laptop,
    className: 'category-card-sage',
  },
  {
    name: 'Fashion',
    note: 'Easy, everyday style',
    icon: Shirt,
    className: 'category-card-peach',
  },
  {
    name: 'Home & Kitchen',
    note: 'Make your space work better',
    icon: CookingPot,
    className: 'category-card-sand',
  },
  {
    name: 'Books',
    note: 'Ideas worth keeping close',
    icon: BookOpen,
    className: 'category-card-blue',
  },
  {
    name: 'Sports',
    note: 'Move, train, and recharge',
    icon: Dumbbell,
    className: 'category-card-lilac',
  },
]

function CategorySection() {
  return (
    <section className="section page-shell" aria-labelledby="categories-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Find your aisle</span>
          <h2 id="categories-heading">Shop by category</h2>
        </div>
        <p>Five focused collections, with something useful in every one.</p>
      </div>

      <div className="category-grid">
        {categories.map(({ name, note, icon: Icon, className }) => (
          <article className={`category-card ${className}`} key={name}>
            <div className="category-icon" aria-hidden="true">
              <Icon size={30} strokeWidth={1.7} />
            </div>
            <div>
              <h3>{name}</h3>
              <p>{note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default CategorySection
