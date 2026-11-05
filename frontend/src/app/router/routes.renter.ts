import type { RouteObject } from 'react-router'

export const renterRoutes: RouteObject[] = [
  { index: true, lazy: () => import('@/features/dashboard/pages/RenterDashboardPage').then((m) => ({ Component: m.default })) },
  { path: 'profile', lazy: () => import('@/features/profile/pages/ProfilePage').then((m) => ({ Component: m.default })) },
  { path: 'license', lazy: () => import('@/features/profile/pages/LicensePage').then((m) => ({ Component: m.default })) },
  { path: 'favorites', lazy: () => import('@/features/favorites/pages/FavoritesPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings', lazy: () => import('@/features/bookings/pages/MyBookingsPage').then((m) => ({ Component: m.default })) },
  { path: 'bookings/:bookingId', lazy: () => import('@/features/bookings/pages/BookingDetailPage').then((m) => ({ Component: m.default })) },
  { path: 'notifications', lazy: () => import('@/features/notifications/pages/NotificationsPage').then((m) => ({ Component: m.default })) },
  { path: 'support', lazy: () => import('@/features/support/pages/TicketsPage').then((m) => ({ Component: m.default })) },
  { path: 'support/new', lazy: () => import('@/features/support/pages/TicketCreatePage').then((m) => ({ Component: m.default })) },
  { path: 'support/:ticketId', lazy: () => import('@/features/support/pages/TicketPage').then((m) => ({ Component: m.default })) },
]

export const renterVerifiedRoutes: RouteObject[] = [
  { path: 'bookings/new', lazy: () => import('@/features/bookings/pages/BookingFormPage').then((m) => ({ Component: m.default })) },
  { path: 'pdd', lazy: () => import('@/features/pdd/pages/PddHomePage').then((m) => ({ Component: m.default })) },
  { path: 'pdd/test', lazy: () => import('@/features/pdd/pages/PddTestPage').then((m) => ({ Component: m.default })) },
  { path: 'group-trips', lazy: () => import('@/features/group-trips/pages/GroupTripsPage').then((m) => ({ Component: m.default })) },
  { path: 'group-trips/new', lazy: () => import('@/features/group-trips/pages/GroupTripCreatePage').then((m) => ({ Component: m.default })) },
  { path: 'group-trips/:tripId', lazy: () => import('@/features/group-trips/pages/GroupTripPage').then((m) => ({ Component: m.default })) },
  { path: 'become-partner', lazy: () => import('@/features/partner/pages/BecomePartnerPage').then((m) => ({ Component: m.default })) },
]
