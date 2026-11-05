import { useAuthStore } from '@/features/auth/store'
import { createClient } from './core'

/** Клиент для пользовательского API (JWT, заголовок Authorization: Bearer). */
export const http = createClient({
  headers: () => {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
  // 401 = токен недействителен: сбрасываем, а RequireAuth сам отправит на /login
  onUnauthorized: () => useAuthStore.getState().clear(),
})
