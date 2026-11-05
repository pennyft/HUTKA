const num = (maxFractionDigits: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: maxFractionDigits })

/** Цена за час без лишних нулей: 7.5 → «7,5», 14 → «14». Валюта (BYN/ч) пишется рядом отдельно. */
export function formatPrice(n: number): string {
  return num(2).format(n)
}

/** Оценка с одним знаком: 4.8 → «4,8». */
export function formatRating(n: number): string {
  return num(1).format(n)
}

/** Расстояние: меньше километра в метрах (округлено до 10 м), дальше в километрах с одним знаком. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} м`
  return `${num(1).format(km)} км`
}

/** Русское склонение по числу: 1 машина, 2 машины, 5 машин. forms = [для 1, для 2–4, для 5+]. */
export function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

export const formatSeats = (n: number) => `${n} ${plural(n, ['место', 'места', 'мест'])}`
export const formatCarsCount = (n: number) => `${n} ${plural(n, ['машина', 'машины', 'машин'])}`

/** Пробег: 84000 → «84 000 км». */
export const formatMileage = (km: number) => `${num(0).format(km)} км`

/** Дата отзыва: «12 октября», а для прошлых лет «12 октября 2025». now передаётся для тестов. */
export function formatReviewDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(d)
}
