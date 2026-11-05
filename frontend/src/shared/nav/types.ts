import type { LucideIcon } from 'lucide-react'

/** Пункт навигации. Один и тот же объект рисуется в верхней панели, боковом меню и нижней панели телефона. */
export interface NavEntry {
  to: string
  label: string
  /** Короткая подпись для нижней панели телефона (иначе label) */
  shortLabel?: string
  icon: LucideIcon
  /** Активен только при точном совпадении пути (для корней вроде /partner) */
  end?: boolean
  /** Свой способ определить активный пункт, если по префиксу пути нельзя */
  match?: (pathname: string) => boolean
  /** Счётчик (непрочитанные, заявки, очереди); 0 и undefined не показываются */
  badge?: number
  /** Красный счётчик: срочное */
  urgent?: boolean
  /** Раздел закрыт, пока не подтверждено ВУ: ссылка ведёт на /app/license с пояснением */
  locked?: boolean
}

export interface NavGroup {
  title?: string
  items: NavEntry[]
}
