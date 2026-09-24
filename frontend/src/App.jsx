import { Navigate, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import HomePage from './pages/HomePage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'

function App() {
  return (
    <div id="top" className="app">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products/:productId" element={<ProductDetailsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
