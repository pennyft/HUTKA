import type { WeatherHazard } from './types'

/** Деньги: всегда две цифры после запятой («15,00»). Цена за час без нулей показывается через formatPrice (каталог). */
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export const HAZARD_LABEL: Record<WeatherHazard, string> = {
  rain: 'Дождь',
  ice: 'Гололёд',
  fog: 'Туман',
  strong_wind: 'Сильный ветер',
  snow: 'Снег',
  thunderstorm: 'Гроза',
}

/**
 * Период погодного явления: «20 окт, 14:00–18:00» в один день и «20 окт, 22:00 – 21 окт, 03:00» через полночь.
 * timeZone нужен тестам, в приложении берётся пояс браузера.
 */
export function formatHazardRange(startIso: string, endIso: string, timeZone?: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone })
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone })
  const sameDay = day.format(s) === day.format(e)
  const clean = (v: string) => v.replace(/\./g, '')
  return sameDay
    ? `${clean(day.format(s))}, ${time.format(s)}–${time.format(e)}`
    : `${clean(day.format(s))}, ${time.format(s)} – ${clean(day.format(e))}, ${time.format(e)}`
}
