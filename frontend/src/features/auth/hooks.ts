import { useQuery } from '@tanstack/react-query'
import { authApi } from './api'
import { useAuthStore } from './store'

/** Текущий пользователь (GET /users/me). Запрос идёт только при наличии токена. */
export function useMe() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: ['me'], queryFn: authApi.me, enabled: !!token })
}
