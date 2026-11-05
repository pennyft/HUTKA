import type { Booking } from '@/features/bookings/types'
import type { DayForecast } from './types'
import { HAZARD_PHRASE } from './weather'

/** Часовой пояс прогноза: бэк отдаёт даты по минскому времени (app.weather.timezone). */
export const FORECAST_ZONE = 'Europe/Minsk'

/** Приветствие по времени суток (по часам браузера). */
export function greeting(now: Date): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 18) return 'Добрый день'
  if (h >= 18 && h < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

/** «вторник, 20 октября». */
export function dateLine(now: Date): string {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
}

/** Дата YYYY-MM-DD в заданном поясе (по умолчанию Минск), чтобы сопоставлять брони с днями прогноза. */
export function dayInZone(value: string | Date, timeZone: string = FORECAST_ZONE): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Температура с настоящим минусом: «12°», «−3°», ноль без знака. */
export function fmtTemp(n: number): string {
  const r = Math.round(n)
  if (r === 0) return '0°'
  return `${r < 0 ? '−' : ''}${Math.abs(r)}°`
}

/** Сколько осталось: «1 д 14 ч», «5 ч 20 мин», «12 мин». */
export function formatLeft(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return h > 0 ? `${d} д ${h} ч` : `${d} д`
  if (h > 0) return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
  return `${m} мин`
}

export type Hero = { kind: 'active'; booking: Booking } | { kind: 'upcoming'; booking: Booking }

/**
 * Главная карточка: идущая поездка, а если её нет, ближайшая по началу (pending). Остальные ожидающие брони идут в
 * список «Ближайшие поездки» (ближайшая не дублируется, если она уже в карточке).
 */
export function pickHero(bookings: Booking[]): { hero: Hero | null; upcoming: Booking[] } {
  const time = (iso: string) => new Date(iso).getTime()
  const active = bookings.filter((b) => b.status === 'active').sort((a, b) => time(a.plannedEndAt) - time(b.plannedEndAt))
  const pending = bookings.filter((b) => b.status === 'pending').sort((a, b) => time(a.plannedStartAt) - time(b.plannedStartAt))
  if (active.length > 0) return { hero: { kind: 'active', booking: active[0] }, upcoming: pending }
  if (pending.length > 0) return { hero: { kind: 'upcoming', booking: pending[0] }, upcoming: pending.slice(1) }
  return { hero: null, upcoming: [] }
}

/** День прогноза для момента времени (по минской дате). */
export function forecastFor(days: DayForecast[], iso: string): DayForecast | undefined {
  const key = dayInZone(iso)
  return days.find((d) => d.date === key)
}

/**
 * Погода одной строкой для поездки: «11° / 4° · без осадков» или «9° / 5° · ожидается дождь».
 * «Без осадков» пишем только если бэк прислал нулевую сумму осадков и явлений нет.
 */
export function dayWeatherLine(d: DayForecast): string {
  const parts: string[] = []
  if (d.temperatureMaxC !== null && d.temperatureMinC !== null) parts.push(`${fmtTemp(d.temperatureMaxC)} / ${fmtTemp(d.temperatureMinC)}`)
  if (d.hazards.length > 0) parts.push(`ожидается ${d.hazards.map((h) => HAZARD_PHRASE[h] ?? h).join(', ')}`)
  else if (d.precipitationSumMm !== null && d.precipitationSumMm <= 0) parts.push('без осадков')
  return parts.join(' · ')
}

/** Время поездки для строки списка: «10:00–14:00», а если она идёт больше суток, период с датами. */
export function clockRange(startIso: string, endIso: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
  const sameDay = day.format(s) === day.format(e)
  return sameDay
    ? `${time.format(s)}–${time.format(e)}`
    : `${time.format(s)} – ${day.format(e).replace(/\./g, '')}, ${time.format(e)}`
}

/** Различные брони среди ожидающих оценок: у одной поездки их две (машина и владелец), а поездок меньше. */
export function distinctBookings(pending: { bookingId: string }[]): string[] {
  return [...new Set(pending.map((p) => p.bookingId))]
}
