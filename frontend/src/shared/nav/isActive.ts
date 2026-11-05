import type { NavEntry } from './types'

/** pathname равен base или лежит внутри него (граница по «/», чтобы /partner/payouts не цеплял /partner/payout-details). */
export function underPath(base: string) {
  return (pathname: string) => pathname === base || pathname.startsWith(`${base}/`)
}

/** Активен ли пункт на текущем пути. Закрытый (locked) пункт никогда не подсвечивается. */
export function isActive(entry: NavEntry, pathname: string): boolean {
  if (entry.locked) return false
  if (entry.match) return entry.match(pathname)
  return entry.end ? pathname === entry.to : underPath(entry.to)(pathname)
}
