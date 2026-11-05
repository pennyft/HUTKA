/** Типы из car/dto/PartnerCarResponse.java, CreateCarRequest.java и car/enums/*.java. */
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid'
export type Transmission = 'auto' | 'manual'
export type BookingMode = 'instant' | 'request_to_book'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'
export type CarStatus = 'available' | 'reserved' | 'in_trip' | 'under_review'

/** GET /partner/cars: машины текущего пользователя вместе с заявками на модерации. */
export interface PartnerCar {
  id: string
  make: string
  model: string
  year: number
  plateNumber: string
  mileageKm: number
  address: string
  pricePerHour: number
  photos: string[]
  inspectionExpiryDate: string
  bookingMode: BookingMode
  moderationStatus: ModerationStatus
  rejectionReason: string | null
  status: CarStatus
  hidden: boolean
  hiddenByStrikes: boolean
  hiddenByAdmin: boolean
  noShowStrikes: number
  ratingAvg: number | null
  monthIncome: number | null
  /** Текущие значения для формы правки (бэк отдаёт их с PartnerCarResponse). null: не задано. */
  description: string | null
  /** JSON-строка расписания в том же виде, в каком её принимает PATCH. */
  availabilitySchedule: string | null
  /** Принимается и возвращается, но пока нигде не показывается. */
  serviceHistory: string | null
}

/** POST /partner/cars. Координаты не передаются: сервер вычисляет их по адресу. */
export interface CreateCarBody {
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
  description?: string
  photos: string[]
  techPassportNumber: string
  insurancePolicyNumber: string
  inspectionExpiryDate: string
  /** JSON-строка расписания (schedule.ts). Не передаётся, если ограничений нет. */
  availabilitySchedule?: string
  bookingMode: BookingMode
}

/** PATCH /partner/cars/{id}: поля, которых нет в теле, не меняются (UpdateCarRequest). */
export interface UpdateCarBody {
  description?: string
  pricePerHour?: number
  /** Весь список фото целиком, минимум 5 (список заменяет прежний). */
  photos?: string[]
  address?: string
  /** JSON-строка расписания. Текущее расписание API не возвращает, поэтому без явного решения партнёра поле не отправляем. */
  availabilitySchedule?: string
  bookingMode?: BookingMode
}

/** GET /partner/analytics (PartnerAnalyticsResponse). Периоды рядов: понедельник недели и первое число месяца (ISO-дата). */
export interface RevenuePoint {
  periodStart: string
  income: number
  trips: number
}
export interface WeekdayStat {
  /** 1 понедельник … 7 воскресенье. */
  isoDay: number
  dayOfWeek: string
  trips: number
}
export interface CarUtilization {
  carId: string
  car: string
  bookedHours: number
  availableHours: number
  /** null, если по расписанию в окне нет доступных часов. */
  utilizationPercent: number | null
}
export interface NextBooking {
  bookingId: string
  carId: string
  car: string
  plannedStartAt: string
  plannedEndAt: string
  status: string
}
export interface PartnerAnalytics {
  currency: string
  summary: { monthIncome: number; monthRentals: number; ratingAvg: number | null; nextBooking: NextBooking | null }
  revenueByWeek: RevenuePoint[]
  revenueByMonth: RevenuePoint[]
  windowDays: number
  topWeekdays: WeekdayStat[]
  averageRentalHours: number | null
  carUtilization: CarUtilization[]
}

/** GET /partner/income?month=yyyy-MM: поездки, из которых сложился доход месяца. */
export interface IncomeTrip {
  bookingId: string
  carId: string
  car: string
  finishedAt: string
  chargedAmount: number
  commissionAmount: number
  partnerAmount: number
}
export interface PartnerIncome {
  month: string
  currency: string
  total: number
  commissionTotal: number
  tripsCount: number
  trips: IncomeTrip[]
}

/** GET /partner/reviews. carId = null: оценка самого партнёра, иначе оценка машины. */
export interface ReviewItem {
  id: string
  bookingId: string
  carId: string | null
  car: string | null
  score: number
  comment: string | null
  createdAt: string
  authorFirstName: string | null
}
export interface ReviewList {
  total: number
  items: ReviewItem[]
}

/** GET /ratings?userId=...: публичные оценки арендатора (нужны среднее и число). */
export interface UserRatings {
  averageRating: number | null
  ratingsCount: number
}

/** Выплаты: payments/dto/*. Суммы в валюте платформы (currency). */
export type PayoutStatus = 'pending' | 'paid'
export interface Payout {
  id: string
  periodStart: string
  periodEnd: string
  amount: number
  commissionDeducted: number
  currency: string
  status: PayoutStatus
  paidAt: string | null
  createdAt: string
}
export interface PayoutList {
  /** Начислено, но ещё не включено в выплату. */
  balance: number
  /** Включено в выплаты, которые ещё не перечислены. */
  pendingAmount: number
  currency: string
  nextPayoutAt: string | null
  total: number
  items: Payout[]
}
export interface PayoutItem {
  bookingId: string
  amount: number
  commission: number
  partnerAmount: number
  chargedAt: string
}
export interface PayoutDetail {
  payout: Payout
  items: PayoutItem[]
}

/** Реквизиты для выплат. Номер карты наружу отдаётся только маской. */
export interface BankDetails {
  present: boolean
  cardMasked: string | null
  holderName: string | null
}
export interface BankDetailsBody {
  cardNumber: string
  holderName: string
}

/** Бронь в списке партнёра: renterName (только имя, без фамилии) бэк заполняет в GET /partner/bookings, в остальных ответах его нет. */
export type PartnerBooking = import('@/features/bookings/types').Booking & { renterName?: string | null }
