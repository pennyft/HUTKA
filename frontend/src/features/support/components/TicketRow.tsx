import { Link } from 'react-router'
import { formatAgo } from '@/features/notifications/time'
import { CATEGORY_LABEL, STATUS_LABEL } from '../labels'
import type { Ticket } from '../types'

/** Строка списка обращений: тема, категория, статус и время последней активности. Срочные помечены. */
export function TicketRow({ ticket: t, to, now }: { ticket: Ticket; to: string; now: Date }) {
  return (
    <li>
      <Link to={to} className="flex items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-fg">{t.subject}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span>{CATEGORY_LABEL[t.category]}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`size-2 rounded-full ${t.status === 'open' ? 'bg-primary' : 'bg-line'}`} />
              {STATUS_LABEL[t.status]}
            </span>
            {t.priority === 'urgent' && (
              <>
                <span aria-hidden>·</span>
                <span className="font-semibold text-danger">Срочное</span>
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted">{formatAgo(t.updatedAt, now)}</span>
      </Link>
    </li>
  )
}
