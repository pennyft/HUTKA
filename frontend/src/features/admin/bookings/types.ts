import type { BookingStatus } from '@/features/bookings/types'

/** adminapi/dto/AdminBookingSummary.java и AdminBookingDetailResponse.java. */
export interface Party {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}
export interface CarRef {
  id: string
  name: string | null
  plateNumber: string | null
}
export interface AdminBookingSummary {
  id: string
  status: BookingStatus
  renter: Party
  car: CarRef
  partner: Party
  plannedStartAt: string
  plannedEndAt: string
  actualStartAt: string | null
  actualEndAt: string | null
  priceEstimate: number | null
  finalPrice: number | null
  /** Просрочка эскалирована в споры. */
  escalated: boolean
  createdAt: string
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed'
export type DisputeStatus = 'open' | 'resolved'
export type DisputeDecision = 'renter_favor' | 'partner_favor'

export interface AdminBookingDetail extends Omit<AdminBookingSummary, 'escalated'> {
  photosBefore: string[]
  photosAfter: string[]
  pricePerHour: number | null
  pddDiscountApplied: boolean
  discountAmount: number | null
  overdueHours: number | null
  declineReason: string | null
  confirmedAt: string | null
  escalatedAt: string | null
  agreementSentAt: string | null
  hasAgreement: boolean
  payment: { status: PaymentStatus; amount: number | null; commissionAmount: number | null; partnerAmount: number | null; currency: string } | null
  dispute: { id: string; status: DisputeStatus; decision: DisputeDecision | null; damageAmount: number | null; createdAt: string; resolvedAt: string | null } | null
  /** События собираются из временных меток самой брони: отдельной истории статусов в БД нет. */
  timeline: { event: string; at: string }[]
}

export interface BookingFilters {
  status: '' | BookingStatus
  carId: string
  renterId: string
  userId: string
  /** YYYY-MM-DD. */
  from: string
  to: string
  page: number
}
