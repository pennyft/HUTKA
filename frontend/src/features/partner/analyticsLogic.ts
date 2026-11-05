const WEEKDAY: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' }
export const weekdayShort = (isoDay: number) => WEEKDAY[isoDay] ?? ''

/** Высоты столбцов в долях от максимума (0–1). Все нули дают нули, а не деление на ноль. */
export function barFractions(values: number[]): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max > 0 ? Math.max(0, v) / max : 0))
}

/** Подпись недели по дате понедельника: «14.10». */
export function weekLabel(isoDate: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(isoDate)
  return m ? `${m[2]}.${m[1]}` : isoDate
}

/** Подпись месяца по первому числу: «окт». */
export function monthLabel(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate)
  if (!m) return isoDate
  return new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1, 12))).replace(/\./g, '')
}

/** «73 %», а если по расписанию нет доступных часов: «нет данных». */
export const percentText = (p: number | null): string => (p === null ? 'нет данных' : `${Math.round(p)} %`)

/** «4,5 ч», «45 мин». */
export function hoursText(h: number | null): string {
  if (h === null) return '—'
  if (h < 1) return `${Math.round(h * 60)} мин`
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(h)} ч`
}

/** Месяц «2026-10» из даты (для запроса дохода) и сдвиг на n месяцев. */
export const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}
export function monthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const s = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
