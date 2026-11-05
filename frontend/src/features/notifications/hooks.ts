import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { NOTIFICATIONS_PAGE_SIZE, notificationsApi } from './api'
import type { NotificationList } from './types'

/** Лента уведомлений постранично. Следующая страница есть, пока пришла полная (общего числа бэк не отдаёт). */
export function useNotifications(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: ({ pageParam, signal }) => notificationsApi.list({ unreadOnly, page: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.notifications.length >= NOTIFICATIONS_PAGE_SIZE ? all.length : undefined),
  })
}

/** Отметить прочитанными (по одному: массового эндпоинта нет). Кэш правим сразу, счётчики в меню перечитываем. */
export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => notificationsApi.markRead(id)))
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length === ids.length) throw (failed[0] as PromiseRejectedResult).reason
    },
    onMutate: (ids) => {
      const set = new Set(ids)
      qc.setQueriesData<InfiniteData<NotificationList>>({ queryKey: ['notifications', 'list'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => {
            const newlyRead = page.notifications.filter((n) => !n.read && set.has(n.id)).length
            return {
              unreadCount: Math.max(0, page.unreadCount - newlyRead),
              notifications: page.notifications.map((n) => (set.has(n.id) ? { ...n, read: true } : n)),
            }
          }),
        }
      })
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['nav'] })
    },
  })
}
