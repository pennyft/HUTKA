import type { BookingStatus } from '@/shared/config/statusColors'

export type { BookingStatus }

/** BookingResponse бэка (booking/dto/BookingResponse.java). Время в UTC (ISO-8601). */
export interface Booking {
  id: string
  renterId: string
  carId: string
  status: BookingStatus
  plannedStartAt: string
  plannedEndAt: string
  actualStartAt: string | null
  actualEndAt: string | null
  photosBefore: string[]
  photosAfter: string[]
  pricePerHour: number
  priceEstimate: number
  finalPrice: number | null
  pddDiscountApplied: boolean
  discountAmount: number | null
  overdueHours: number | null
  confirmedAt: string | null
  declineReason: string | null
  createdAt: string
}

export type WeatherHazard = 'rain' | 'ice' | 'fog' | 'strong_wind' | 'snow' | 'thunderstorm'

export interface HazardWindow {
  hazard: WeatherHazard
  startsAt: string
  endsAt: string
}

/**
 * Блок window ответа GET /weather/forecast. available = false: погодный блок показывать не нужно
 * (beyond_horizon: поездка дальше 7 дней, in_past: окно уже закончилось).
 */
export interface WeatherWindow {
  from: string
  to: string
  available: boolean
  unavailableReason: string | null
  warnings: HazardWindow[]
}
