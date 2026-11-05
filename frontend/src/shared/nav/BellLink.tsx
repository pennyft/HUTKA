import { Bell } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useUnreadCount } from './useNavData'

/** Колокольчик со счётчиком непрочитанных. to — страница уведомлений своего кабинета. */
export function BellLink({ to }: { to: string }) {
  const unread = useUnreadCount()
  const active = useLocation().pathname === to
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      aria-label={unread ? `Уведомления, непрочитанных: ${unread}` : 'Уведомления'}
      className={`relative flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-primary-fg"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
