/** Деньги. Валюту бэк отдаёт отдельным полем currency (в части ответов), поэтому передаётся параметром. */
export function formatMoney(amount: number | string, currency = 'BYN'): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(n)
}

/** Даты бэк отдаёт ISO-8601 (UTC); показываем в локальном времени пользователя. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
