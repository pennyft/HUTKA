/** Правила времени брони: зеркало проверок бэка (booking/service/AvailabilityService.assertCanBook). */

const MIN = 60_000
export const REQUEST_TO_BOOK_LEAD_MS = 6 * 60 * MIN
/** Шаг выбора времени: 15 минут. */
export const STEP_MINUTES = 15

/** Округление момента вверх до шага (по умолчанию 15 минут). */
export function roundUp(date: Date, stepMinutes = STEP_MINUTES): Date {
  const step = stepMinutes * MIN
  return new Date(Math.ceil(date.getTime() / step) * step)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Дата и время в локальном поясе в виде значений для <input type="date"> и <input type="time">. */
export function toLocalParts(d: Date): { date: string; time: string } {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Обратное преобразование. Пустое или некорректное значение даёт null. */
export function fromLocalParts(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^(\d{2}):(\d{2})$/.exec(time)
  if (!d || !t) return null
  const result = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]))
  return Number.isNaN(result.getTime()) ? null : result
}

export type BookingMode = 'instant' | 'request_to_book'

/**
 * Начало по умолчанию. Для заявки бэк требует старт не раньше чем через 6 часов от момента отправки,
 * поэтому берём запас в 30 минут, чтобы форма не стала невалидной, пока пользователь её заполняет.
 */
export function defaultStart(mode: BookingMode, now: Date): Date {
  const lead = mode === 'request_to_book' ? REQUEST_TO_BOOK_LEAD_MS + 30 * MIN : 15 * MIN
  return roundUp(new Date(now.getTime() + lead))
}

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Проверка диапазона. Тексты повторяют ответы бэка, чтобы пользователь видел одно и то же до и после отправки. */
export function validateRange(p: { start: Date | null; end: Date | null; mode: BookingMode; now: Date }): string | null {
  const { start, end, mode, now } = p
  if (!start || !end) return 'Укажите дату и время начала и окончания'
  if (end <= start) return 'Время окончания должно быть позже времени начала'
  if (start < now) return 'Время начала не может быть в прошлом'
  if (mode === 'request_to_book') {
    const earliest = new Date(now.getTime() + REQUEST_TO_BOOK_LEAD_MS)
    if (start < earliest) {
      return `Для заявки начало аренды должно быть не ближе 6 часов от текущего момента (не раньше ${formatClock(roundUp(earliest))})`
    }
  }
  return null
}

/** Длительность словами: «2 ч 30 мин», «45 мин», «1 сут 2 ч». */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 мин'
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return [days ? `${days} сут` : '', hours ? `${hours} ч` : '', minutes ? `${minutes} мин` : ''].filter(Boolean).join(' ')
}
