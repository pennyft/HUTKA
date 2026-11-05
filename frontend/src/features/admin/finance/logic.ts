import type { PeriodQuery } from './api'
import type { ExportKind, Period } from './types'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const parseDay = (v: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Период из адреса (?from=2026-10-01&to=2026-10-25). Значения не по формату отбрасываются. */
export function parsePeriod(sp: URLSearchParams): Period {
  const f = sp.get('from') ?? ''
  const t = sp.get('to') ?? ''
  return { from: DAY.test(f) ? f : '', to: DAY.test(t) ? t : '' }
}
export function periodToParams(p: Period): Record<string, string> {
  const out: Record<string, string> = {}
  if (p.from) out.from = p.from
  if (p.to) out.to = p.to
  return out
}

/**
 * Период в запрос: даты это календарные дни устройства. from начало первого дня, to начало дня после последнего (граница [from, to),
 * последний выбранный день входит целиком). Пустой период бэк понимает как «с начала текущего месяца до сейчас».
 */
export function periodToQuery(p: Period): PeriodQuery {
  const q: PeriodQuery = {}
  const f = parseDay(p.from)
  const t = parseDay(p.to)
  if (f) q.from = f.toISOString()
  if (t) q.to = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).toISOString()
  return q
}

/** Сервер ответит 400, если to не позже from: проверяем заранее. Даты в одном дне допустимы (период день целиком). */
export function periodProblem(p: Period): string | null {
  const f = parseDay(p.from)
  const t = parseDay(p.to)
  if (f && t && t.getTime() < f.getTime()) return 'Конец периода раньше начала'
  return null
}

export type PeriodPreset = 'month' | 'prevMonth' | 'days30'
export const PRESET_LABEL: Record<PeriodPreset, string> = { month: 'Этот месяц', prevMonth: 'Прошлый месяц', days30: 'Последние 30 дней' }

/** Быстрые периоды: этот месяц (по сегодня), прошлый месяц целиком, 30 дней по сегодня. */
export function presetPeriod(preset: PeriodPreset, now: Date): Period {
  if (preset === 'month') return { from: dayKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: dayKey(now) }
  if (preset === 'prevMonth') return { from: dayKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: dayKey(new Date(now.getFullYear(), now.getMonth(), 0)) }
  return { from: dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: dayKey(now) }
}

/** Имя скачиваемого файла: «hutka-commissions-2026-10-01_2026-10-25.csv». Без периода указываем сегодняшний день. */
export function exportFileName(kind: ExportKind, p: Period, now: Date): string {
  const from = p.from || dayKey(new Date(now.getFullYear(), now.getMonth(), 1))
  const to = p.to || dayKey(now)
  return `hutka-${kind}-${from}_${to}.csv`
}

/** «10 %», «7,5 %». */
export const percentLabel = (n: number): string => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n)} %`

export const EXPORT_LIMIT = 50_000
