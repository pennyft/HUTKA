import { http } from '@/api/http'
import type { AuthToken, User } from './types'

export const authApi = {
  // skipUnauthorized = true: 401 на логине означает «неверные данные», а не «токен истёк»
  login: (body: { email: string; password: string }) => http.request<AuthToken>('/auth/login', { method: 'POST', body }, true),
  register: (body: {
    firstName: string
    lastName: string
    email: string
    phone: string
    birthDate: string
    password: string
  }) => http.request('/auth/register', { method: 'POST', body }, true),
  verifyEmail: (body: { email: string; code: string }) =>
    http.request<AuthToken>('/auth/verify-email', { method: 'POST', body }, true),
  resendCode: (email: string) => http.request('/auth/resend-code', { method: 'POST', query: { email } }, true),
  forgotPassword: (email: string) => http.request('/auth/forgot-password', { method: 'POST', body: { email } }, true),
  resetPassword: (body: { token: string; newPassword: string }) =>
    http.request('/auth/reset-password', { method: 'POST', body }, true),
  me: () => http.request<User>('/users/me'),
}
