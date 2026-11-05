import { http } from '@/api/http'
import type { User } from '@/features/auth/types'

/** Элемент GET /notifications. Для license_rejected payload = { reason } (adminapi/service/AdminUserService.java бэка). */
interface NotificationItem {
  id: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean
  createdAt: string
}

export const profileApi = {
  /** PATCH /users/me: бэк требует хотя бы одно поле; email и дату рождения изменить нельзя. */
  updateMe: (body: { firstName: string; lastName: string; phone: string }) =>
    http.request<User>('/users/me', { method: 'PATCH', body }),

  /** POST /auth/license (200 без тела). После успеха статус становится pending. */
  submitLicense: (body: { licenseNumber: string; licenseIssueDate: string }) =>
    http.request('/auth/license', { method: 'POST', body }),

  /**
   * Причину отклонения ВУ в GET /users/me бэк не отдаёт, она есть только в уведомлении license_rejected.
   * Берём последние 50 уведомлений (новые сверху) и ищем первое такого типа.
   */
  lastLicenseRejectionReason: async (): Promise<string | null> => {
    const res = await http.request<{ notifications: NotificationItem[] }>('/notifications', { query: { size: 50 } })
    const n = res.notifications.find((x) => x.type === 'license_rejected')
    const reason = n?.payload?.reason
    return typeof reason === 'string' && reason ? reason : null
  },
}
