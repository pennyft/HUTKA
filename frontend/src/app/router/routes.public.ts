import type { RouteObject } from 'react-router'

/** Каталог и карточка машины: открыты без токена. */
export const publicRoutes: RouteObject[] = [
  { path: 'cars', lazy: () => import('@/features/cars/pages/CatalogPage').then((m) => ({ Component: m.default })) },
  { path: 'cars/:carId', lazy: () => import('@/features/cars/pages/CarPage').then((m) => ({ Component: m.default })) },
]

/** Экраны входа A2–A6: без шапки, карточка по центру (AuthLayout). */
export const authRoutes: RouteObject[] = [
  { path: 'register', lazy: () => import('@/features/auth/pages/RegisterPage').then((m) => ({ Component: m.default })) },
  { path: 'verify-email', lazy: () => import('@/features/auth/pages/VerifyEmailPage').then((m) => ({ Component: m.default })) },
  { path: 'login', lazy: () => import('@/features/auth/pages/LoginPage').then((m) => ({ Component: m.default })) },
  { path: 'forgot-password', lazy: () => import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ Component: m.default })) },
  { path: 'reset-password', lazy: () => import('@/features/auth/pages/ResetPasswordPage').then((m) => ({ Component: m.default })) },
]
