/**
 * Расписание доступности машины (P3, P4). Бэк принимает JSON-строку вида
 * {"mon":[{"from":"08:00","to":"22:00"}], ..., "sun":[]} (AvailabilityScheduleParser): ключи mon–sun, время ЧЧ:ММ, конец суток 24:00,
 * не больше 10 окон в день, окна не пересекаются. Расписание не задано: ограничений нет. Задано: день без окон значит «машина недоступна».
 */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]
export const DAY_LABEL: Record<DayKey, string> = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' }
export const MAX_WINDOWS_PER_DAY = 10

export interface TimeWindow {
  from: string
  to: string
}
export type ScheduleDraft = Record<DayKey, TimeWindow[]>

export const emptySchedule = (): ScheduleDraft => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] })

/** Одно и то же окно во все дни. */
export function uniformSchedule(window: TimeWindow): ScheduleDraft {
  const d = emptySchedule()
  for (const k of DAY_KEYS) d[k] = [{ ...window }]
  return d
}

/** Минуты от начала суток. Начало окна 00:00 до 23:59, конец до 24:00 (в минутах 1440). Некорректное время даёт null. */
export function toMinutes(time: string, isEnd: boolean): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (min > 59) return null
  if (h === 24 && min === 0 && isEnd) return 1440
  return h <= 23 ? h * 60 + min : null
}

/** Варианты времени с шагом 30 минут. Начало: 00:00–23:30, конец: 00:30–24:00. */
export function timeOptions(isEnd: boolean): string[] {
  const out: string[] = []
  for (let m = isEnd ? 30 : 0; m <= (isEnd ? 1440 : 1410); m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  return out
}

/** Текст первой найденной проблемы или null. Правила как на бэке, плюс одно клиентское: включённое расписание без окон бессмысленно. */
export function validateSchedule(d: ScheduleDraft): string | null {
  let total = 0
  for (const k of DAY_KEYS) {
    const windows = d[k]
    if (windows.length > MAX_WINDOWS_PER_DAY) return `${DAY_LABEL[k]}: не больше ${MAX_WINDOWS_PER_DAY} окон в день.`
    const parsed: [number, number][] = []
    for (const w of windows) {
      const from = toMinutes(w.from, false)
      const to = toMinutes(w.to, true)
      if (from === null || to === null) return `${DAY_LABEL[k]}: укажите время окна.`
      if (to <= from) return `${DAY_LABEL[k]}: конец окна должен быть позже начала.`
      parsed.push([from, to])
    }
    parsed.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i][0] < parsed[i - 1][1]) return `${DAY_LABEL[k]}: окна пересекаются.`
    }
    total += windows.length
  }
  return total === 0 ? 'Добавьте хотя бы одно окно доступности или отключите ограничение.' : null
}

/** JSON для бэка: все семь дней, у недоступных пустой массив. Ограничение выключено: null (поле не отправляем). */
export function scheduleToJson(d: ScheduleDraft, enabled: boolean): string | null {
  if (!enabled) return null
  const out: Record<string, TimeWindow[]> = {}
  for (const k of DAY_KEYS) out[k] = d[k].map((w) => ({ from: w.from, to: w.to }))
  return JSON.stringify(out)
}

/**
 * Расписание из ответа бэка (PartnerCarResponse.availabilitySchedule, JSON-строка) в черновик редактора.
 * null: расписания нет (ограничений нет) либо строка не разобралась. Лишние ключи и дни без массива игнорируются,
 * окна в неверном формате отбрасываются: форма не должна падать из-за чужих данных.
 */
export function parseSchedule(json: string | null | undefined): ScheduleDraft | null {
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const out = emptySchedule()
  for (const day of DAY_KEYS) {
    const windows = (raw as Record<string, unknown>)[day]
    if (!Array.isArray(windows)) continue
    out[day] = windows.flatMap((w) => {
      if (typeof w !== 'object' || w === null) return []
      const { from, to } = w as { from?: unknown; to?: unknown }
      return typeof from === 'string' && typeof to === 'string' ? [{ from, to }] : []
    })
  }
  return out
}

/** Одно и то же расписание в двух записях (порядок ключей и пробелы не важны): нужно, чтобы не отправлять неизменённое. */
export function sameScheduleJson(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = parseSchedule(a)
  const pb = parseSchedule(b)
  if (pa === null || pb === null) return pa === pb
  return scheduleToJson(pa, true) === scheduleToJson(pb, true)
}
