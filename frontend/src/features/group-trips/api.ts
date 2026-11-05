import { http } from '@/api/http'
import type { ChatHistory, CreateTripBody, TripDetail, TripList, TripStatus } from './types'

export const TRIPS_PAGE_SIZE = 20
export const CHAT_PAGE_SIZE = 50

export const groupTripsApi = {
  /**
   * GET /group-trips. В общем списке допустимы только open и closed (иначе 400), «мои» (mine=true) приходят в любых
   * статусах. Для гостей и не подтверждённых ВУ бэк отвечает 403.
   */
  list: (p: { mine: boolean; status?: TripStatus; page: number }, signal?: AbortSignal) =>
    http.request<TripList>('/group-trips', { query: { mine: p.mine, status: p.status, page: p.page, size: TRIPS_PAGE_SIZE }, signal }),

  details: (id: string, signal?: AbortSignal) => http.request<TripDetail>(`/group-trips/${id}`, { signal }),

  /** POST /group-trips: создатель сразу организатор и участник. */
  create: (body: CreateTripBody) => http.request<TripDetail>('/group-trips', { method: 'POST', body }),

  /** POST .../join. 409: поездка отменена или завершена, набор закрыт, уже участвуете, мест нет. */
  join: (id: string) => http.request<TripDetail>(`/group-trips/${id}/join`, { method: 'POST' }),

  /** PATCH .../close: только организатор (403 иначе). */
  close: (id: string) => http.request<TripDetail>(`/group-trips/${id}/close`, { method: 'PATCH' }),

  /** POST .../cancel: только организатор и только до даты поездки (в день поездки 409). */
  cancel: (id: string) => http.request<TripDetail>(`/group-trips/${id}/cancel`, { method: 'POST' }),

  /** GET .../messages: только участникам (403 иначе), новые первыми. */
  messages: (id: string, page: number, signal?: AbortSignal) =>
    http.request<ChatHistory>(`/group-trips/${id}/messages`, { query: { page, size: CHAT_PAGE_SIZE }, signal }),
}
