import { http } from '@/api/http'
import type { Booking, BookingStatus } from '@/features/bookings/types'
import type { BankDetails, BankDetailsBody, CreateCarBody, PartnerAnalytics, PartnerBooking, PartnerCar, PartnerIncome, PayoutDetail, PayoutList, ReviewList, UpdateCarBody, UserRatings } from './types'

export interface PartnerBookingsQuery {
  status?: BookingStatus
  carId?: string
  /** Границы периода (ISO-момент). */
  from?: string
  to?: string
  /** Постранично (page с 0, size до 100): тогда общее число в заголовке X-Total-Count. Без них приходит весь список. */
  page?: number
  size?: number
}

export const partnerApi = {
  /** GET /partner/cars: свои машины и заявки со статусом модерации (pending, approved, rejected). */
  cars: (signal?: AbortSignal) => http.request<PartnerCar[]>('/partner/cars', { signal }),

  /**
   * POST /partner/cars → 201 без тела (в Location лежит адрес новой машины). Заявка уходит на модерацию.
   * 400 с текстом: год не раньше 2014, пробег до 200 000 км, техосмотр не в прошлом, неверное расписание, адрес не найден.
   * 403, если ВУ не подтверждено.
   */
  createCar: (body: CreateCarBody) => http.request<void>('/partner/cars', { method: 'POST', body }),

  /** PATCH /partner/cars/{id}. 409: смена адреса, пока есть активные брони. 400: пустой адрес, меньше 5 фото. */
  updateCar: (id: string, body: UpdateCarBody) => http.request<void>(`/partner/cars/${id}`, { method: 'PATCH', body }),
  /** PATCH /partner/cars/{id}/visibility {hidden}. 403: машину скрыл администратор или система по неявкам, показать её может только админ. */
  setVisibility: (id: string, hidden: boolean) => http.request<void>(`/partner/cars/${id}/visibility`, { method: 'PATCH', body: { hidden } }),
  /** DELETE /partner/cars/{id} → 204. 409: есть завершённые поездки (тогда только скрыть) или активные брони. */
  deleteCar: (id: string) => http.request<void>(`/partner/cars/${id}`, { method: 'DELETE' }),

  /** GET /partner/analytics. weeks 1–52 (по умолчанию 12), months 1–24 (6), days 1–90 (30): бэк обрезает значения сам. */
  analytics: (p: { weeks?: number; months?: number; days?: number }, signal?: AbortSignal) => http.request<PartnerAnalytics>('/partner/analytics', { query: p, signal }),
  /** GET /partner/income?month=yyyy-MM. */
  income: (month: string, signal?: AbortSignal) => http.request<PartnerIncome>('/partner/income', { query: { month }, signal }),
  /** GET /partner/bookings: брони по всем машинам партнёра, новые сверху; в каждой есть renterName. */
  bookings: (q: PartnerBookingsQuery, signal?: AbortSignal) => http.request<PartnerBooking[]>('/partner/bookings', { query: { ...q }, signal }),
  /** POST /bookings/{id}/approve. 409: «Заявка уже обработана» и «Время ответа на заявку истекло». */
  approve: (id: string) => http.request<Booking>(`/bookings/${id}/approve`, { method: 'POST' }),
  /** POST /bookings/{id}/decline {reason}: причина обязательна, до 255 символов. Те же 409. */
  decline: (id: string, reason: string) => http.request<Booking>(`/bookings/${id}/decline`, { method: 'POST', body: { reason } }),

  reviews: (page: number, size: number, signal?: AbortSignal) => http.request<ReviewList>('/partner/reviews', { query: { page, size }, signal }),
  payouts: (page: number, size: number, signal?: AbortSignal) => http.request<PayoutList>('/partner/payouts', { query: { page, size }, signal }),
  payout: (id: string, signal?: AbortSignal) => http.request<PayoutDetail>(`/partner/payouts/${id}`, { signal }),
  bankDetails: (signal?: AbortSignal) => http.request<BankDetails>('/partner/payout-details', { signal }),
  /** PUT /partner/payout-details. 400: номер карты 16–19 цифр, имя 2–100 символов (буквы, пробел, точка, апостроф, дефис). */
  saveBankDetails: (body: BankDetailsBody) => http.request<BankDetails>('/partner/payout-details', { method: 'PUT', body }),

  /** GET /ratings?userId=...: рейтинг арендатора для заявки (берём среднее и число оценок, страница размера 1). */
  userRatings: (userId: string, signal?: AbortSignal) => http.request<UserRatings>('/ratings', { query: { userId, page: 0, size: 1 }, signal }),
}
