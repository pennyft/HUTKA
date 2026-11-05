import { http } from '@/api/http'
import type { AppNotification, NotificationList } from './types'

export const NOTIFICATIONS_PAGE_SIZE = 20

export const notificationsApi = {
  /** GET /notifications. В ответе нет общего числа, только unreadCount: следующая страница есть, пока пришла полная. */
  list: (p: { unreadOnly: boolean; page: number }, signal?: AbortSignal) =>
    http.request<NotificationList>('/notifications', { query: { unreadOnly: p.unreadOnly, page: p.page, size: NOTIFICATIONS_PAGE_SIZE }, signal }),

  /** PATCH /notifications/{id}/read. Массового эндпоинта «прочитать все» на бэке нет. */
  markRead: (id: string) => http.request<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' }),
}
