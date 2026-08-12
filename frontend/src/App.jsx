import { Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './store/authStore';

const HomePage = lazy(() => import('./pages/Home/HomePage.jsx'));
const AuthPage = lazy(() => import('./pages/Auth/AuthPage.jsx'));
const MarketplacePage = lazy(() => import('./pages/Marketplace/MarketplacePage.jsx'));
const ProductPage = lazy(() => import('./pages/Product/ProductPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/Checkout/CheckoutPage.jsx'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage.jsx'));
const OrdersPage = lazy(() => import('./pages/Orders/OrdersPage.jsx'));
const SellerShopsPage = lazy(() => import('./pages/Seller/ShopsPage.jsx'));
const SellerProductsPage = lazy(() => import('./pages/Seller/ProductsPage.jsx'));
const EditProductPage = lazy(() => import('./pages/Seller/EditProductPage.jsx'));
const EditShopPage = lazy(() => import('./pages/Seller/EditShopPage.jsx'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) fetchUser();
  }, []);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/seller/shops" element={<SellerShopsPage />} />
        <Route path="/seller/shops/:id/edit" element={<EditShopPage />} />
        <Route path="/seller/shops/:id/products" element={<SellerProductsPage />} />
        <Route path="/seller/products/:id/edit" element={<EditProductPage />} />
      </Routes>
    </Suspense>
  );
}
