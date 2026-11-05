import { useAdminStore } from '@/features/admin/store'
import { createClient } from './core'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Клиент админки: cookie-сессия (credentials: include) и X-CSRF-TOKEN на каждый POST/PATCH/PUT/DELETE. */
export const adminHttp = createClient({
  credentials: 'include',
  headers: (method) => {
    const csrf = useAdminStore.getState().csrfToken
    return !SAFE.has(method) && csrf ? { 'X-CSRF-TOKEN': csrf } : {}
  },
  onUnauthorized: () => useAdminStore.getState().setGuest(),
})
