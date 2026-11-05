import { adminHttp } from '@/api/adminHttp'
import type { AdminPage, AdminRatingItem, AdminSession, AdminUserDetail, AdminUserSummary, Dashboard, LicenseRequest, VerificationStatus } from './types'

export const ADMIN_PAGE_SIZE = 20

export interface UsersQuery {
  verificationStatus?: VerificationStatus
  partner?: boolean
  blocked?: boolean
  q?: string
  page: number
}

export const adminApi = {
  /** POST /admin/auth/login: сессия в cookie JSESSIONID, в ответе csrfToken для всех POST/PATCH/DELETE. 401 «Неверный email или пароль», 429 после 5 попыток за 15 минут. */
  login: (email: string, password: string) => adminHttp.request<AdminSession>('/admin/auth/login', { method: 'POST', body: { email, password } }),

  /** POST /admin/auth/change-password → 204. 400: пароль неверен или совпадает с текущим; новый от 12 до 72 символов. */
  changePassword: (currentPassword: string, newPassword: string) =>
    adminHttp.request<void>('/admin/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  /** GET /admin/dashboard?days=: метрики периода, очереди, ряды по дням и лента событий. */
  dashboard: (days: number, signal?: AbortSignal) => adminHttp.request<Dashboard>('/admin/dashboard', { query: { days }, signal }),

  users: (q: UsersQuery, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<AdminUserSummary>>('/admin/users', { query: { ...q, size: ADMIN_PAGE_SIZE }, signal }),
  user: (id: string, signal?: AbortSignal) => adminHttp.request<AdminUserDetail>(`/admin/users/${id}`, { signal }),
  userRatings: (id: string, page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<AdminRatingItem>>(`/admin/users/${id}/ratings`, { query: { page, size: ADMIN_PAGE_SIZE }, signal }),
  /** POST /admin/users/{id}/block {reason до 500}. Заблокированный не может войти, его выданные токены перестают работать. 409: уже заблокирован. */
  block: (id: string, reason: string) => adminHttp.request<AdminUserDetail>(`/admin/users/${id}/block`, { method: 'POST', body: { reason } }),
  /** POST /admin/users/{id}/unblock. 409: не заблокирован. */
  unblock: (id: string) => adminHttp.request<AdminUserDetail>(`/admin/users/${id}/unblock`, { method: 'POST' }),

  /** GET /admin/users/license-requests: заявки pending, самые давние регистрации первыми. */
  licenseRequests: (page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<LicenseRequest>>('/admin/users/license-requests', { query: { page, size: ADMIN_PAGE_SIZE }, signal }),
  /** POST /admin/users/{id}/license/approve. 409 «Заявка не находится на рассмотрении». */
  approveLicense: (id: string) => adminHttp.request<LicenseRequest>(`/admin/users/${id}/license/approve`, { method: 'POST' }),
  /** POST /admin/users/{id}/license/reject {reason до 500}: пользователь возвращается в unverified и получает причину уведомлением. */
  rejectLicense: (id: string, reason: string) => adminHttp.request<LicenseRequest>(`/admin/users/${id}/license/reject`, { method: 'POST', body: { reason } }),
}
