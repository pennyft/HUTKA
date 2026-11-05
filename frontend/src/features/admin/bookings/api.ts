import { adminHttp } from '@/api/adminHttp'
import { ADMIN_PAGE_SIZE } from '../api'
import type { AdminPage } from '../types'
import type { AdminBookingDetail, AdminBookingSummary } from './types'

export interface BookingsQuery {
  status?: string
  carId?: string
  renterId?: string
  userId?: string
  from?: string
  to?: string
  page: number
}

export const adminBookingsApi = {
  /** GET /admin/bookings: все брони платформы, новые сверху. userId это арендатор или владелец машины. from включительно, to исключительно, по времени начала. */
  list: (q: BookingsQuery, signal?: AbortSignal) => adminHttp.request<AdminPage<AdminBookingSummary>>('/admin/bookings', { query: { ...q, size: ADMIN_PAGE_SIZE }, signal }),
  get: (id: string, signal?: AbortSignal) => adminHttp.request<AdminBookingDetail>(`/admin/bookings/${id}`, { signal }),
  /** POST /admin/bookings/{id}/force-close. 409: поездка не идёт, бронь не передавалась в спор или спор ещё не решён. */
  forceClose: (id: string) => adminHttp.request<AdminBookingDetail>(`/admin/bookings/${id}/force-close`, { method: 'POST' }),
}
