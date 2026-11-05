import type { TripStatus } from './types'

export const STATUS_LABEL: Record<TripStatus, string> = {
  open: 'Набор открыт',
  closed: 'Набор закрыт',
  finished: 'Завершена',
  cancelled: 'Отменена',
}

/** «25 октября, вс» из даты YYYY-MM-DD (считаем в UTC на полдень, чтобы пояс браузера не сдвигал день). */
export function formatTripDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
  const wd = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(d)
  return `${day}, ${wd}`
}

export const participantsText = (count: number, max: number) => `${count} из ${max}`

/** Оценка участника с одним знаком: 4,8. */
export const formatRatingValue = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n)
