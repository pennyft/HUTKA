import { adminHttp } from '@/api/adminHttp'
import { ADMIN_PAGE_SIZE } from '../api'
import type { AdminPage } from '../types'
import { tabQuery } from './logic'
import type { AdminCar, CarTab } from './types'

export const carsApi = {
  /** GET /admin/cars: заявки pending старые первыми, остальные новые первыми. */
  list: (tab: CarTab, page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<AdminCar>>('/admin/cars', { query: { ...tabQuery(tab), page, size: ADMIN_PAGE_SIZE }, signal }),

  /**
   * GET /admin/cars/{id}. ВНИМАНИЕ: в исходном бэке этого эндпоинта нет (только список и действия), экран карточки машины
   * без него не работает. Добавьте метод details в AdminCarService и @GetMapping("/{id}") в AdminCarController (см. файлы в зипе).
   */
  get: (id: string, signal?: AbortSignal) => adminHttp.request<AdminCar>(`/admin/cars/${id}`, { signal }),

  /** POST /admin/cars/{id}/approve: первая одобренная машина делает пользователя партнёром (ему уходит car_approved). 409 «Заявка уже обработана». */
  approve: (id: string) => adminHttp.request<AdminCar>(`/admin/cars/${id}/approve`, { method: 'POST' }),
  /** POST /admin/cars/{id}/reject {reason}: партнёру уходит car_rejected с причиной. */
  reject: (id: string, reason: string) => adminHttp.request<AdminCar>(`/admin/cars/${id}/reject`, { method: 'POST', body: { reason } }),
  /** POST /admin/cars/{id}/hide {reason}. 409: уже скрыта администратором. */
  hide: (id: string, reason: string) => adminHttp.request<AdminCar>(`/admin/cars/${id}/hide`, { method: 'POST', body: { reason } }),
  /** POST /admin/cars/{id}/unhide. 409: не скрыта администратором. */
  unhide: (id: string) => adminHttp.request<AdminCar>(`/admin/cars/${id}/unhide`, { method: 'POST' }),
  /** POST /admin/cars/{id}/return-to-catalog: машина, скрытая по неявкам, возвращается, счётчик страйков сбрасывается. 409: не скрыта по неявкам. */
  returnToCatalog: (id: string) => adminHttp.request<AdminCar>(`/admin/cars/${id}/return-to-catalog`, { method: 'POST' }),
  /** DELETE /admin/cars/{id} → 204. 409: есть завершённые поездки или активные брони. */
  remove: (id: string) => adminHttp.request<void>(`/admin/cars/${id}`, { method: 'DELETE' }),
}
