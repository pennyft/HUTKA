/** Типы из adminapi/dto/*.java. Даты приходят ISO-8601 (UTC), суммы числом. */
export type VerificationStatus = 'unverified' | 'pending' | 'verified'

/** Страница списка в админке: total по фильтру, items текущая страница (page с 0). */
export interface AdminPage<T> {
  total: number
  items: T[]
}

export interface AdminSession {
  id: string
  email: string
  displayName: string
  csrfToken: string
}

export interface AdminUserSummary {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  verificationStatus: VerificationStatus
  partner: boolean
  blocked: boolean
  blockedReason: string | null
  ratingAvg: number | null
  createdAt: string
}

export interface AdminRatingItem {
  id: string
  bookingId: string
  fromUserId: string
  authorName: string | null
  /** Заполнен у оценки машины, у оценки человека пусто. */
  toCarId: string | null
  score: number
  comment: string | null
  createdAt: string
}

export interface AdminUserDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  emailVerified: boolean
  phone: string
  birthDate: string
  verificationStatus: VerificationStatus
  licenseNumber: string | null
  licenseIssueDate: string | null
  licenseRejectionReason: string | null
  partner: boolean
  blocked: boolean
  blockedReason: string | null
  blockedAt: string | null
  blockedByAdminId: string | null
  ratingAvg: number | null
  createdAt: string
  stats: { bookingsTotal: number; bookingsFinished: number; bookingsCancelled: number; carsCount: number; ratingsCount: number }
  recentRatings: AdminRatingItem[]
}

/** Заявка в очереди проверки ВУ (pending). Даты подачи заявки в данных нет, только дата регистрации. */
export interface LicenseRequest {
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  licenseNumber: string
  licenseIssueDate: string
  verificationStatus: VerificationStatus
  licenseRejectionReason: string | null
  registeredAt: string
}

export interface DayCount {
  date: string
  value: number
}
export interface DayAmount {
  date: string
  value: number
}
export type ActivityType = 'user_registered' | 'car_submitted' | 'booking_created' | 'dispute_opened' | 'ticket_created'
export interface Activity {
  type: ActivityType | string
  at: string
  entityId: string
  label: string
}
export interface DashboardQueues {
  licenseRequests: number
  carModeration: number
  openDisputes: number
  openTickets: number
  urgentOpenTickets: number
}
export interface Dashboard {
  generatedAt: string
  days: number
  currency: string
  users: { total: number; verified: number; partners: number; blocked: number; newInPeriod: number; activeRenters: number }
  cars: { approved: number; visible: number; hidden: number; pendingModeration: number }
  bookings: { total: number; byStatus: Record<string, number>; createdInPeriod: number }
  finance: { totalCharged: number; platformCommission: number; partnerEarnings: number; paymentsCount: number }
  queues: DashboardQueues
  registrationsByDay: DayCount[]
  bookingsByDay: DayCount[]
  commissionByDay: DayAmount[]
  recentActivity: Activity[]
}

export interface UserFilters {
  verificationStatus: '' | VerificationStatus
  /** '' все, 'yes' только партнёры, 'no' только не партнёры. */
  partner: '' | 'yes' | 'no'
  blocked: '' | 'yes' | 'no'
  q: string
  page: number
}
