import type { BookingStatus } from '@/features/bookings/types'
import type { CarStatus } from '@/features/partner/types'
import type { DisputeDecision, DisputeStatus } from '../bookings/types'

/** adminapi/dto/AdminDisputeSummary.java: очередь споров и история решений. decision, damageAmount, resolvedAt только у решённых. */
export interface AdminDisputeSummary {
  id: string
  bookingId: string
  status: DisputeStatus
  decision: DisputeDecision | null
  damageAmount: number | null
  createdAt: string
  resolvedAt: string | null
  carId: string
  car: string | null
  renterName: string | null
  partnerName: string | null
  bookingStatus: BookingStatus
  plannedEndAt: string
}

interface Party {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

/** adminapi/dto/AdminDisputeDetailResponse.java. */
export interface AdminDisputeDetail {
  id: string
  status: DisputeStatus
  decision: DisputeDecision | null
  damageAmount: number | null
  createdAt: string
  resolvedAt: string | null
  resolvedByAdminId: string | null
  renter: Party
  partner: Party
  car: { id: string; make: string; model: string; plateNumber: string; status: CarStatus }
  booking: {
    id: string
    status: BookingStatus
    plannedStartAt: string
    plannedEndAt: string
    actualStartAt: string | null
    actualEndAt: string | null
    escalatedAt: string | null
    photosBefore: string[]
    photosAfter: string[]
    pricePerHour: number | null
    priceEstimate: number | null
    finalPrice: number | null
    discountAmount: number | null
    overdueHours: number | null
    declineReason: string | null
  }
  timeline: { event: string; at: string }[]
}

export interface ResolveBody {
  decision: DisputeDecision
  /** Обязательна при partner_favor (0.00 допустимо), при renter_favor не передаётся. */
  damageAmount?: number
}
