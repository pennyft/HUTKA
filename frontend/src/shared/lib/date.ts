/** Полных лет на дату now по дате рождения в формате YYYY-MM-DD. Некорректная дата даёт 0. */
export function getAge(birthIso: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso)
  if (!m) return 0
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = now.getFullYear() - y
  const before = now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)
  if (before) age--
  return age
}

/** Сегодняшняя дата для атрибута max у <input type="date"> (локальная, YYYY-MM-DD). */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
