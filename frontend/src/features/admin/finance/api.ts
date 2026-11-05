import { adminHttp } from '@/api/adminHttp'
import type { PayoutStatus } from '@/features/partner/types'
import { ADMIN_PAGE_SIZE } from '../api'
import type { AdminPage } from '../types'
import type { AdminPayout, CommissionItem, ExportKind, FinanceSummary } from './types'

export interface PeriodQuery {
  from?: string
  to?: string
}

export const financeApi = {
  /** GET /admin/finance/summary?from&to. По умолчанию с начала текущего месяца до сейчас. 400, если to не позже from. */
  summary: (q: PeriodQuery, signal?: AbortSignal) => adminHttp.request<FinanceSummary>('/admin/finance/summary', { query: { ...q }, signal }),

  commissions: (q: PeriodQuery, page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<CommissionItem>>('/admin/finance/commissions', { query: { ...q, page, size: ADMIN_PAGE_SIZE }, signal }),

  payouts: (status: PayoutStatus | undefined, page: number, signal?: AbortSignal) =>
    adminHttp.request<AdminPage<AdminPayout>>('/admin/finance/payouts', { query: { status, page, size: ADMIN_PAGE_SIZE }, signal }),

  /**
   * GET /admin/finance/export?kind=commissions|payouts&from&to: CSV (UTF-8 с BOM, разделитель «;»). Файл собирается в памяти бэка:
   * потолок 50 000 строк, при превышении 400 «Слишком много строк, сузьте период». Скачивается через Blob (запрос с cookie сессии).
   */
  exportCsv: (kind: ExportKind, q: PeriodQuery) => adminHttp.blob('/admin/finance/export', { query: { kind, ...q } }),
}
