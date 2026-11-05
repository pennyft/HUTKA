import type { RouteObject } from 'react-router'

export const adminRoutes: RouteObject[] = [
  { index: true, lazy: () => import('@/features/admin/pages/AdminDashboardPage').then((m) => ({ Component: m.default })) },
  { path: 'users', lazy: () => import('@/features/admin/pages/AdminUsersPage').then((m) => ({ Component: m.default })) },
  { path: 'users/:userId', lazy: () => import('@/features/admin/pages/AdminUserPage').then((m) => ({ Component: m.default })) },
  { path: 'license-requests', lazy: () => import('@/features/admin/pages/AdminLicenseRequestsPage').then((m) => ({ Component: m.default })) },
  { path: 'cars', lazy: () => import('@/features/admin/pages/AdminCarsPage').then((m) => ({ Component: m.default })) },
  { path: 'cars/:carId', lazy: () => import('@/features/admin/pages/AdminCarPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings', lazy: () => import('@/features/admin/pages/AdminBookingsPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings/:bookingId', lazy: () => import('@/features/admin/pages/AdminBookingPage').then((m) => ({ Component: m.default })) },
  { path: 'disputes', lazy: () => import('@/features/admin/pages/AdminDisputesPage').then((m) => ({ Component: m.default })) },
  { path: 'disputes/:disputeId', lazy: () => import('@/features/admin/pages/AdminDisputePage').then((m) => ({ Component: m.default })) },
  { path: 'finance', lazy: () => import('@/features/admin/pages/AdminFinanceSummaryPage').then((m) => ({ Component: m.default })) },
  { path: 'finance/commissions', lazy: () => import('@/features/admin/pages/AdminCommissionsPage').then((m) => ({ Component: m.default })) },
  { path: 'finance/payouts', lazy: () => import('@/features/admin/pages/AdminPayoutsPage').then((m) => ({ Component: m.default })) },
  { path: 'tickets', lazy: () => import('@/features/admin/pages/AdminTicketsPage').then((m) => ({ Component: m.default })) },
  { path: 'tickets/:ticketId', lazy: () => import('@/features/admin/pages/AdminTicketPage').then((m) => ({ Component: m.default })) },
  { path: 'pdd-questions', lazy: () => import('@/features/admin/pages/AdminPddQuestionsPage').then((m) => ({ Component: m.default })) },
  { path: 'settings', lazy: () => import('@/features/admin/pages/AdminSettingsPage').then((m) => ({ Component: m.default })) },
  { path: 'change-password', lazy: () => import('@/features/admin/pages/AdminChangePasswordPage').then((m) => ({ Component: m.default })) },
]
