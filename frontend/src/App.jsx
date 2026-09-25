import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import { CartProvider } from './context/CartContext.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import HomePage from './pages/HomePage.jsx'
import OrderResultPage from './pages/OrderResultPage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'

function App() {
  return (
    <CartProvider>
      <div id="top" className="app">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-result" element={<OrderResultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App
