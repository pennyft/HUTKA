import type { BookingMode, CarStatus, FuelType, ModerationStatus, Transmission } from '@/features/partner/types'

/** adminapi/dto/AdminCarResponse.java. Расширяет вид машины партнёра: контакты партнёра, документы и причины скрытия. */
export interface AdminCar {
  id: string
  partnerId: string
  partnerName: string | null
  partnerEmail: string | null
  make: string
  model: string
  year: number
  plateNumber: string
  mileageKm: number
  fuelType: FuelType
  transmission: Transmission
  seats: number
  bodyType: string
  address: string
  pricePerHour: number
  description: string | null
  photos: string[]
  techPassportNumber: string
  insurancePolicyNumber: string
  inspectionExpiryDate: string
  bookingMode: BookingMode
  moderationStatus: ModerationStatus
  rejectionReason: string | null
  status: CarStatus
  hidden: boolean
  hiddenByStrikes: boolean
  noShowStrikes: number
  createdAt: string
  hiddenByAdmin: boolean
  hiddenByAdminReason: string | null
}

/**
 * Вкладки списка. Бэк (AdminCarService.list) трактует булевы фильтры так: hiddenByStrikes=true даёт только скрытые по неявкам,
 * hiddenByAdmin=true только скрытые администратором, false значит «фильтр выключен». Статус модерации при этом игнорируется,
 * а без явного статуса берётся pending, поэтому списка «все машины» бэк не умеет.
 */
export type CarTab = 'pending' | 'approved' | 'rejected' | 'strikes' | 'admin'
