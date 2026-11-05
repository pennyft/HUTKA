export { formatHazardRange as formatPeriod } from './format'

/** Момент в локальном поясе: «20 окт, 14:00». timeZone нужен тестам. */
export function formatMoment(iso: string, timeZone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone }).format(d).replace(/\./g, '')
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone }).format(d)
  return `${day}, ${time}`
}
