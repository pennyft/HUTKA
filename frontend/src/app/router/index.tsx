import { Navigate, createBrowserRouter } from 'react-router'
import { AuthLayout } from '@/shared/layouts/AuthLayout'
import { PublicLayout } from '@/shared/layouts/PublicLayout'
import { RenterLayout } from '@/shared/layouts/RenterLayout'
import { PartnerLayout } from '@/shared/layouts/PartnerLayout'
import { AdminLayout } from '@/shared/layouts/AdminLayout'
import { RequireAdmin, RequireAuth, RequirePartner, RequireVerified } from './guards'
import { authRoutes, publicRoutes } from './routes.public'
import { renterRoutes, renterVerifiedRoutes } from './routes.renter'
import { partnerRoutes } from './routes.partner'
import { adminRoutes } from './routes.admin'

export const router = createBrowserRouter([
  // Гость и вход: каталог открыт без токена
  {
    element: <PublicLayout />,
    children: [{ path: '/', element: <Navigate to="/cars" replace /> }, ...publicRoutes],
  },
  // Вход и регистрация
  { element: <AuthLayout />, children: authRoutes },
  // Кабинет арендатора
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <RenterLayout />,
        children: [...renterRoutes, { element: <RequireVerified />, children: renterVerifiedRoutes }],
      },
    ],
  },
  // Кабинет партнёра (isPartner = true)
  {
    path: '/partner',
    element: <RequireAuth />,
    children: [
      {
        element: <RequirePartner />,
        children: [{ element: <PartnerLayout />, children: partnerRoutes }],
      },
    ],
  },
  // Админка: отдельная сессионная авторизация
  {
    path: '/admin/login',
    lazy: () => import('@/features/admin/pages/AdminLoginPage').then((m) => ({ Component: m.default })),
  },
  {
    path: '/admin',
    element: <RequireAdmin />,
    children: [{ element: <AdminLayout />, children: adminRoutes }],
  },
  { path: '*', element: <Navigate to="/cars" replace /> },
])
