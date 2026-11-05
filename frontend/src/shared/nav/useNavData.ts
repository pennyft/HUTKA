import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { adminHttp } from '@/api/adminHttp'
import { useAuthStore } from '@/features/auth/store'
import type { AdminQueues } from './entries'

/**
 * Счётчики для меню. Все ключи начинаются с 'nav': SocketBridge сбрасывает этот префикс на каждое
 * уведомление по WebSocket, поэтому цифры обновляются сразу, без опроса.
 */

/** GET /notifications: unreadCount считается по всем непрочитанным, а не по странице, поэтому хватает size=1. */
export function useUnreadCount(): number {
  const token = useAuthStore((s) => s.token)
  const { data } = useQuery({
    queryKey: ['nav', 'unread'],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: () =>
      http.request<{ unreadCount: number }>('/notifications', { query: { unreadOnly: true, size: 1 } }).then((r) => r.unreadCount),
  })
  return data ?? 0
}

/** Заявки Request to Book: бронь pending без confirmedAt. Эндпоинт отдаёт массив без страниц. */
export function usePartnerPendingRequests(): number {
  const token = useAuthStore((s) => s.token)
  const { data } = useQuery({
    queryKey: ['nav', 'partner-pending'],
    enabled: !!token,
    staleTime: 30_000,
    queryFn: () =>
      http
        .request<{ confirmedAt?: string | null }[]>('/partner/bookings', { query: { status: 'pending' } })
        .then((list) => list.filter((b) => !b.confirmedAt).length),
  })
  return data ?? 0
}

/** Очереди админа из дашборда. WebSocket у админки нет, поэтому раз в минуту обновляем опросом. */
export function useAdminQueues(): AdminQueues | undefined {
  const { data } = useQuery({
    queryKey: ['nav', 'admin-queues'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => adminHttp.request<{ queues: AdminQueues }>('/admin/dashboard').then((r) => r.queues),
  })
  return data
}
