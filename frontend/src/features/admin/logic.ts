import type { UsersQuery } from './api'
import type { Activity, DashboardQueues, DayAmount, DayCount, UserFilters, VerificationStatus } from './types'

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: 'Не подтверждён',
  pending: 'На проверке',
  verified: 'Подтверждён',
}

export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim()

/** Страницы списков: page с 0. «1–20 из 135». */
export function rangeText(page: number, size: number, total: number): string {
  if (total === 0) return 'нет записей'
  return `${page * size + 1}–${Math.min((page + 1) * size, total)} из ${total}`
}
export const pageCount = (total: number, size: number): number => Math.max(1, Math.ceil(total / size))

/** Причина блокировки и отклонения: обязательна, до 500 символов (ReasonRequest, RejectRequest). */
export const REASON_MAX = 500
export function reasonProblem(reason: string): string | null {
  const r = reason.trim()
  if (r.length === 0) return 'Укажите причину'
  if (r.length > REASON_MAX) return `Не больше ${REASON_MAX} символов`
  return null
}

/** Пароль администратора: 12–72 символа (AdminChangePasswordRequest). BCrypt учитывает только 72 байта, а кириллица занимает по 2: предупреждаем. */
export function passwordProblem(current: string, next: string, repeat: string): string | null {
  if (!current) return 'Введите текущий пароль'
  if (next.length < 12) return 'Новый пароль: не меньше 12 символов'
  if (next.length > 72) return 'Новый пароль: не больше 72 символов'
  if (new TextEncoder().encode(next).length > 72) return 'Пароль длиннее 72 байт (русские буквы занимают по 2 байта): сделайте его короче'
  if (next === current) return 'Новый пароль совпадает с текущим'
  if (next !== repeat) return 'Пароли не совпадают'
  return null
}

/** Фильтры списка пользователей из адресной строки (?status=pending&partner=yes&blocked=no&q=иван&page=2, страница с 1). */
export function parseUserFilters(sp: URLSearchParams): UserFilters {
  const v = sp.get('status')
  const yn = (k: string): '' | 'yes' | 'no' => (sp.get(k) === 'yes' ? 'yes' : sp.get(k) === 'no' ? 'no' : '')
  const page = Number(sp.get('page'))
  return {
    verificationStatus: v === 'unverified' || v === 'pending' || v === 'verified' ? v : '',
    partner: yn('partner'),
    blocked: yn('blocked'),
    q: sp.get('q') ?? '',
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
  }
}

/** Обратно в адрес: пустые значения не пишем, страница с 1. */
export function userFiltersToParams(f: UserFilters): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.verificationStatus) out.status = f.verificationStatus
  if (f.partner) out.partner = f.partner
  if (f.blocked) out.blocked = f.blocked
  if (f.q.trim()) out.q = f.q.trim()
  if (f.page > 0) out.page = String(f.page + 1)
  return out
}

/** Запрос к API: да и нет в булевы, пустое не передаём. */
export function userFiltersToQuery(f: UserFilters): UsersQuery {
  const q: UsersQuery = { page: f.page }
  if (f.verificationStatus) q.verificationStatus = f.verificationStatus
  if (f.partner) q.partner = f.partner === 'yes'
  if (f.blocked) q.blocked = f.blocked === 'yes'
  if (f.q.trim()) q.q = f.q.trim()
  return q
}

export const PERIODS = [7, 30, 90] as const

/** Ряд по дням в столбцы графика: подпись «дд.мм». */
export function dayBars(list: (DayCount | DayAmount)[]): { key: string; label: string; value: number }[] {
  return list.map((d) => {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(d.date)
    return { key: d.date, label: m ? `${m[2]}.${m[1]}` : d.date, value: Number(d.value) }
  })
}

const STATUS_LABEL: Record<string, string> = { pending: 'Ожидают', active: 'Идут', finished: 'Завершены', cancelled: 'Отменены' }
/** Брони по статусам: известные в привычном порядке, незнакомые статусы не теряем. */
export function statusRows(byStatus: Record<string, number>): { status: string; label: string; count: number }[] {
  const order = Object.keys(STATUS_LABEL)
  const keys = [...order.filter((k) => k in byStatus), ...Object.keys(byStatus).filter((k) => !order.includes(k))]
  return keys.map((k) => ({ status: k, label: STATUS_LABEL[k] ?? k, count: byStatus[k] }))
}

/** Плитки очередей на дашборде: куда ведут (экраны AD5, AD6, AD10, AD16). Срочные тикеты выделяем отдельной строкой. */
export function queueTiles(q: DashboardQueues): { key: string; label: string; count: number; to: string; note?: string }[] {
  return [
    { key: 'license', label: 'Проверка ВУ', count: q.licenseRequests, to: '/admin/license-requests' },
    { key: 'cars', label: 'Модерация машин', count: q.carModeration, to: '/admin/cars?moderationStatus=pending' },
    { key: 'disputes', label: 'Открытые споры', count: q.openDisputes, to: '/admin/disputes' },
    { key: 'tickets', label: 'Открытые обращения', count: q.openTickets, to: '/admin/tickets', note: q.urgentOpenTickets > 0 ? `срочных: ${q.urgentOpenTickets}` : undefined },
  ]
}

const ACTIVITY: Record<string, { title: string; to: (id: string) => string }> = {
  user_registered: { title: 'Регистрация', to: (id) => `/admin/users/${id}` },
  car_submitted: { title: 'Заявка на машину', to: (id) => `/admin/cars/${id}` },
  booking_created: { title: 'Новая бронь', to: (id) => `/admin/bookings/${id}` },
  dispute_opened: { title: 'Открыт спор', to: (id) => `/admin/disputes/${id}` },
  ticket_created: { title: 'Новое обращение', to: (id) => `/admin/tickets/${id}` },
}

/** Лента событий: подпись и ссылка. Лента собирается из событий создания, журнала действий администраторов в системе нет. */
export function describeActivity(a: Activity): { title: string; to: string | null } {
  const d = ACTIVITY[a.type]
  return d ? { title: d.title, to: d.to(a.entityId) } : { title: a.type, to: null }
}

/** Дата без времени (день рождения, дата выдачи ВУ): «20 октября 2026 г.». Значение не по формату YYYY-MM-DD возвращаем как есть. */
export function formatDay(date: string | null | undefined): string {
  if (!date) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return date
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)))
}
