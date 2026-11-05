import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { adminApi, type UsersQuery } from './api'
import { useAdminStore } from './store'

/** Запросы админки идут только при живой сессии: до проверки /admin/auth/me и после выхода они не нужны. */
const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function useDashboard(days: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'dashboard', days], queryFn: ({ signal }) => adminApi.dashboard(days, signal), enabled: authed, staleTime: 30_000, refetchInterval: 60_000 })
}

/** Список пользователей. Пока грузится следующая страница или меняется фильтр, показываем прежний результат: таблица не мигает. */
export function useAdminUsers(q: UsersQuery) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'users', q], queryFn: ({ signal }) => adminApi.users(q, signal), enabled: authed, placeholderData: keepPreviousData })
}

export function useAdminUser(id: string) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'user', id], queryFn: ({ signal }) => adminApi.user(id, signal), enabled: authed && !!id })
}

/** Все оценки пользователя (в профиле только последние) подгружаются порциями. */
export function useUserRatings(id: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['admin', 'user-ratings', id],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => adminApi.userRatings(id, pageParam, signal),
    getNextPageParam: (last, all) => (all.reduce((n, p) => n + p.items.length, 0) < last.total ? all.length : undefined),
  })
}

export function useLicenseRequests(page: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'license-requests', page], queryFn: ({ signal }) => adminApi.licenseRequests(page, signal), enabled: authed, placeholderData: keepPreviousData })
}

/** После любого действия по пользователю обновляем списки, профиль и счётчики очередей в меню. 409 (уже обработано) показываем текстом бэка. */
function useRefreshAfter() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
  }
}

export function useUserActions() {
  const refresh = useRefreshAfter()
  const block = useMutation({
    mutationFn: (v: { id: string; reason: string }) => adminApi.block(v.id, v.reason),
    onSuccess: () => toast.success('Пользователь заблокирован.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  })
  const unblock = useMutation({
    mutationFn: (id: string) => adminApi.unblock(id),
    onSuccess: () => toast.success('Пользователь разблокирован.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  })
  return { block, unblock }
}

export function useLicenseActions() {
  const refresh = useRefreshAfter()
  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveLicense(id),
    onSuccess: () => toast.success('Удостоверение подтверждено.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  })
  const reject = useMutation({
    mutationFn: (v: { id: string; reason: string }) => adminApi.rejectLicense(v.id, v.reason),
    onSuccess: () => toast.success('Заявка отклонена, пользователь получит причину.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  })
  return { approve, reject }
}
