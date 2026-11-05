import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { isActive } from './isActive'
import type { NavEntry } from './types'

export const LICENSE_PATH = '/app/license'

interface Props {
  entry: NavEntry
  className: (active: boolean) => string
  children: (active: boolean) => ReactNode
}

/**
 * Ссылка пункта меню. Активность считаем сами (isActive), а не через NavLink: у закрытого пункта адрес
 * подменяется на /app/license, и NavLink подсвечивал бы его, когда пользователь на странице верификации.
 */
export function NavEntryLink({ entry, className, children }: Props) {
  const { pathname } = useLocation()
  const active = isActive(entry, pathname)
  return (
    <Link
      to={entry.locked ? LICENSE_PATH : entry.to}
      state={entry.locked ? { needVerification: true } : undefined}
      aria-current={active ? 'page' : undefined}
      title={entry.locked ? 'Доступно после подтверждения ВУ' : undefined}
      className={className(active)}
    >
      {children(active)}
    </Link>
  )
}
