import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ShopPage } from '../pages/ShopPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CartPage } from '../pages/CartPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { CategoryManagementPage } from '../pages/CategoryManagementPage';
import { ProfilePage } from '../pages/ProfilePage';
import { UsersManagementPage } from '../pages/UsersManagementPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { CouponManagementPage } from '../pages/CouponManagementPage';
import { MyCouponsPage } from '../pages/MyCouponsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ShopPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/products',
    element: (
      <ProtectedRoute requiredRoles={['administrator']}>
        <ProductsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/cart',
    element: <CartPage />, 
  },
  {
    path: '/product/:productId',
    element: <ProductDetailPage />,
  },
  {
    path: '/favorites',
    element: (
      <ProtectedRoute requiredRoles={['user']}>
        <FavoritesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkout',
    element: (
      <ProtectedRoute>
        <CheckoutPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/orders',
    element: (
      <ProtectedRoute>
        <OrdersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/orders/:orderId',
    element: (
      <ProtectedRoute>
        <OrderDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-coupons',
    element: (
      <ProtectedRoute requiredRoles={['user']}>
        <MyCouponsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/coupon-management',
    element: (
      <ProtectedRoute requiredRoles={['manager']}>
        <CouponManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/categories',
    element: (
      <ProtectedRoute requiredRoles={['manager', 'administrator']}>
        <CategoryManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute requiredRoles={['manager']}>
        <UsersManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/logs',
    element: (
      <ProtectedRoute requiredRoles={['administrator', 'manager']}>
        <AuditLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/audit-logs',
    element: (
      <ProtectedRoute requiredRoles={['administrator', 'manager']}>
        <AuditLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
