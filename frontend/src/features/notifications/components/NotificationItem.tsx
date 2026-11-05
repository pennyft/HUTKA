import { Link } from 'react-router'
import { formatAgo } from '../time'
import type { AppNotification, Cabinet } from '../types'
import { notificationView } from '../view'

interface Props {
  notification: AppNotification
  cabinet: Cabinet
  now: Date
  onRead: (id: string) => void
}

/**
 * Строка уведомления. С ссылкой: переход и отметка прочитанным одним нажатием. Без ссылки: нажатие только отмечает
 * прочитанным. Непрочитанные выделены точкой и жирным заголовком (для скринридера есть скрытая подпись).
 */
export function NotificationItem({ notification: n, cabinet, now, onRead }: Props) {
  const view = notificationView(n, cabinet)
  const markIfUnread = () => {
    if (!n.read) onRead(n.id)
  }
  const className = 'flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2'
  const content = (
    <>
      <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
      <span className="min-w-0 flex-1">
        {!n.read && <span className="sr-only">Непрочитано. </span>}
        <span className={`block text-fg ${n.read ? 'font-medium' : 'font-semibold'}`}>{view.title}</span>
        {view.body && <span className="mt-0.5 block whitespace-pre-line text-sm text-muted">{view.body}</span>}
        <span className="mt-1 block text-xs text-muted">{formatAgo(n.createdAt, now)}</span>
      </span>
    </>
  )

  return (
    <li>
      {view.to ? (
        <Link to={view.to} onClick={markIfUnread} className={className}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={markIfUnread} className={className}>
          {content}
        </button>
      )}
    </li>
  )
}
