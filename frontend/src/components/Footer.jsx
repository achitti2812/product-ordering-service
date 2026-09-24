import { Sparkles } from 'lucide-react'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner page-shell">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-footer" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <strong>ReacSpi</strong>
            <span>Everyday goods, chosen well.</span>
          </div>
        </div>
        <p>A learning project built with React and Spring Boot.</p>
        <span>© {new Date().getFullYear()} ReacSpi</span>
      </div>
    </footer>
  )
}

export default Footer
