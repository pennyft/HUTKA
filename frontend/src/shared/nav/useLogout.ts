import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'

/** Выход пользователя: клиентского logout-эндпоинта нет, удаляем токен и весь кэш, чтобы данные не достались следующему. */
export function useLogout() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const clear = useAuthStore((s) => s.clear)
  return () => {
    clear()
    qc.clear()
    navigate('/cars', { replace: true })
  }
}
