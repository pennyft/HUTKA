const MIN = 60_000
const HOUR = 60 * MIN

/**
 * Время уведомления: «только что», «5 мин назад», «3 ч назад», дальше дата («12 окт, 14:05»).
 * now и timeZone передаются для тестов.
 */
export function formatAgo(iso: string, now: Date = new Date(), timeZone?: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  const diff = now.getTime() - t.getTime()
  if (diff < MIN) return 'только что'
  if (diff < HOUR) return `${Math.floor(diff / MIN)} мин назад`
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)} ч назад`
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone }).format(t).replace(/\./g, '')
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone }).format(t)
  return `${day}, ${time}`
}
