import { http } from '@/api/http'
import type { CreateTicketBody, TicketDetail, TicketList, TicketMessage, TicketStatus, Cabinet } from './types'

export const TICKETS_PAGE_SIZE = 20

export const supportApi = {
  /** GET /tickets: тикеты текущего пользователя, последняя активность сверху. audience отделяет кабинет арендатора от партнёрского. */
  list: (p: { audience: Cabinet; status?: TicketStatus; page: number }, signal?: AbortSignal) =>
    http.request<TicketList>('/tickets', { query: { audience: p.audience, status: p.status, page: p.page, size: TICKETS_PAGE_SIZE }, signal }),

  /** GET /tickets/{id}. Чужой тикет неотличим от несуществующего: 404 «Тикет не найден». */
  get: (id: string, signal?: AbortSignal) => http.request<TicketDetail>(`/tickets/${id}`, { signal }),

  /** POST /tickets → 201. 400: пустая или слишком длинная тема (до 200) и описание (до 4000). */
  create: (body: CreateTicketBody) => http.request<TicketDetail>('/tickets', { method: 'POST', body }),

  /** POST /tickets/{id}/messages → 201. 409, если тикет закрыт (сначала переоткрыть или создать новый). */
  addMessage: (id: string, body: string) => http.request<TicketMessage>(`/tickets/${id}/messages`, { method: 'POST', body: { body } }),

  /** PATCH /tickets/{id}/reopen. message необязателен и попадает в переписку. 409: тикет уже открыт или прошло больше 7 дней. */
  reopen: (id: string, message?: string) => http.request<TicketDetail>(`/tickets/${id}/reopen`, { method: 'PATCH', body: message ? { message } : {} }),
}
