import { adminHttp } from '@/api/adminHttp'
import { ADMIN_PAGE_SIZE } from '../api'
import type { DisputeStatus } from '../bookings/types'
import type { AdminPage } from '../types'
import type { AdminDisputeDetail, AdminDisputeSummary, ResolveBody } from './types'

export const disputesApi = {
  /** GET /admin/disputes?status=open|resolved: открытые старые первыми, решённые новые первыми. Споры создаёт система при просрочке возврата больше 3 часов. */
  list: (status: DisputeStatus, page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<AdminDisputeSummary>>('/admin/disputes', { query: { status, page, size: ADMIN_PAGE_SIZE }, signal }),
  get: (id: string, signal?: AbortSignal) => adminHttp.request<AdminDisputeDetail>(`/admin/disputes/${id}`, { signal }),
  /**
   * POST /admin/disputes/{id}/resolve {decision, damageAmount}. 400 с текстом, если сумма не по правилам; 409 «Спор уже решён».
   * После решения машина возвращается из under_review в оборот при любом исходе, обе стороны получают dispute_resolved, статус брони не меняется.
   */
  resolve: (id: string, body: ResolveBody) => adminHttp.request<AdminDisputeDetail>(`/admin/disputes/${id}/resolve`, { method: 'POST', body }),
}
