import type { PayoutStatus } from '@/features/partner/types'

/** adminapi/dto/FinanceSummaryResponse.java. Период [from, to) по успешным списаниям; «за всё время» и «сейчас» от периода не зависят. */
export interface FinanceSummary {
  from: string
  to: string
  currency: string
  paymentsCount: number
  totalCharged: number
  platformCommission: number
  partnerEarnings: number
  /** Неудачные списания. Ручного повтора списания в API нет, поэтому выделяем их в интерфейсе. */
  failedCharges: number
  /** Перечислено партнёрам за всё время. */
  paidOutAllTime: number
  /** Начислено партнёрам и ещё не перечислено (баланс и выплаты в ожидании). */
  awaitingPayoutNow: number
}

/** adminapi/dto/CommissionItemResponse.java: процент комиссии хранится в каждой записи, поэтому смена настройки старые записи не меняет. */
export interface CommissionItem {
  bookingId: string
  partnerId: string
  amount: number
  commissionPercent: number
  commissionAmount: number
  chargedAt: string
}

/** payments/dto/PayoutResponse.java (в админских финансах с partnerId). */
export interface AdminPayout {
  id: string
  partnerId: string
  periodStart: string
  periodEnd: string
  amount: number
  commissionDeducted: number
  currency: string
  status: PayoutStatus
  paidAt: string | null
  createdAt: string
}

export type ExportKind = 'commissions' | 'payouts'

/** Период в полях формы: даты YYYY-MM-DD, обе необязательны. Пусто = «с начала текущего месяца до сейчас». */
export interface Period {
  from: string
  to: string
}
