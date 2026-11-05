import { adminHttp } from '@/api/adminHttp'
import { useAdminStore, type AdminInfo } from './store'

interface AdminSessionResponse extends AdminInfo {
  csrfToken: string
}

/** AD1: при каждой загрузке панели проверяем сессию; ответ содержит актуальный csrfToken. */
export async function loadAdminSession(): Promise<void> {
  try {
    const me = await adminHttp.request<AdminSessionResponse>('/admin/auth/me')
    useAdminStore.getState().setSession({ id: me.id, email: me.email, displayName: me.displayName }, me.csrfToken)
  } catch {
    useAdminStore.getState().setGuest()
  }
}
