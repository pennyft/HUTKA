import { adminHttp } from '@/api/adminHttp'
import { ADMIN_PAGE_SIZE } from '../api'
import type { AdminPage } from '../types'
import type { CreatePddBody, PddQuestion, UpdatePddBody } from './types'

export const adminPddApi = {
  /** GET /admin/pdd/questions?active&page&size. Статистики прохождений в API нет. */
  list: (active: boolean | undefined, page: number, size = ADMIN_PAGE_SIZE, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<PddQuestion>>('/admin/pdd/questions', { query: { active, page, size }, signal }),
  /** POST /admin/pdd/questions → 201. 400 с текстом: вариантов от 2 до 10, не пустые, без повторов, correctIndex в пределах. */
  create: (body: CreatePddBody) => adminHttp.request<PddQuestion>('/admin/pdd/questions', { method: 'POST', body }),
  /** PATCH: меняются только переданные поля; если меняются варианты или верный индекс, проверяется итоговая пара. */
  update: (id: string, body: UpdatePddBody) => adminHttp.request<PddQuestion>(`/admin/pdd/questions/${id}`, { method: 'PATCH', body }),
  /** DELETE → 204. */
  remove: (id: string) => adminHttp.request<void>(`/admin/pdd/questions/${id}`, { method: 'DELETE' }),
}
