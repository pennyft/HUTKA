import type { RouteObject } from 'react-router'

export const partnerRoutes: RouteObject[] = [
  { index: true, lazy: () => import('@/features/partner/pages/PartnerDashboardPage').then((m) => ({ Component: m.default })) },
  { path: 'cars', lazy: () => import('@/features/partner/pages/PartnerCarsPage').then((m) => ({ Component: m.default })) },
  { path: 'cars/new', lazy: () => import('@/features/partner/pages/PartnerCarCreatePage').then((m) => ({ Component: m.default })) },
  { path: 'cars/:carId/edit', lazy: () => import('@/features/partner/pages/PartnerCarEditPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings', lazy: () => import('@/features/partner/pages/PartnerBookingsPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings/:bookingId', lazy: () => import('@/features/partner/pages/PartnerBookingPage').then((m) => ({ Component: m.default })) },
  { path: 'analytics', lazy: () => import('@/features/partner/pages/PartnerAnalyticsPage').then((m) => ({ Component: m.default })) },
  { path: 'reviews', lazy: () => import('@/features/partner/pages/PartnerReviewsPage').then((m) => ({ Component: m.default })) },
  { path: 'payouts', lazy: () => import('@/features/partner/pages/PartnerPayoutsPage').then((m) => ({ Component: m.default })) },
  { path: 'payouts/:payoutId', lazy: () => import('@/features/partner/pages/PartnerPayoutPage').then((m) => ({ Component: m.default })) },
  { path: 'payout-details', lazy: () => import('@/features/partner/pages/PartnerPayoutDetailsPage').then((m) => ({ Component: m.default })) },
  { path: 'support', lazy: () => import('@/features/support/pages/TicketsPage').then((m) => ({ Component: m.default })) },
  { path: 'support/new', lazy: () => import('@/features/support/pages/TicketCreatePage').then((m) => ({ Component: m.default })) },
  { path: 'support/:ticketId', lazy: () => import('@/features/support/pages/TicketPage').then((m) => ({ Component: m.default })) },
  { path: 'notifications', lazy: () => import('@/features/notifications/pages/NotificationsPage').then((m) => ({ Component: m.default })) },
]
