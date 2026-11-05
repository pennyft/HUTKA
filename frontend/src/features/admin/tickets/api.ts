import { adminHttp } from '@/api/adminHttp'
import { ADMIN_PAGE_SIZE } from '../api'
import type { AdminPage } from '../types'
import type { AdminTicketDetail, AdminTicketMessage, AdminTicketSummary, TicketStats } from './types'

export interface TicketsQuery {
  status: 'open' | 'closed'
  priority?: string
  category?: string
  audience?: string
  page: number
}

export const adminTicketsApi = {
  /** GET /admin/tickets: открытые (сначала срочные, затем те, кто дольше ждёт ответа) и закрытые (недавно закрытые первыми). */
  list: (q: TicketsQuery, signal?: AbortSignal) => adminHttp.request<AdminPage<AdminTicketSummary>>('/admin/tickets', { query: { ...q, size: ADMIN_PAGE_SIZE }, signal }),
  /** GET /admin/tickets/stats: окно 30 дней. */
  stats: (signal?: AbortSignal) => adminHttp.request<TicketStats>('/admin/tickets/stats', { signal }),
  get: (id: string, signal?: AbortSignal) => adminHttp.request<AdminTicketDetail>(`/admin/tickets/${id}`, { signal }),
  /** POST /admin/tickets/{id}/messages {body} → 201 сообщение. 409, если тикет закрыт. Пользователь получает ticket_message. */
  reply: (id: string, body: string) => adminHttp.request<AdminTicketMessage>(`/admin/tickets/${id}/messages`, { method: 'POST', body: { body } }),
  /** PATCH /admin/tickets/{id}/close: пользователь получает ticket_closed и 7 дней на переоткрытие. 409, если уже закрыт. */
  close: (id: string) => adminHttp.request<AdminTicketDetail>(`/admin/tickets/${id}/close`, { method: 'PATCH' }),
}
