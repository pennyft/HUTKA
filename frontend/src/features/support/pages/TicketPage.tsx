import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Composer } from '../components/Composer'
import { MessageBubble } from '../components/MessageBubble'
import { ReopenBox } from '../components/ReopenBox'
import { useTicket } from '../hooks'
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../labels'
import { cabinetOf, conversation, reopenState, supportBase } from '../logic'

/**
 * B21. Обращение: GET /tickets/{id}, POST /tickets/{id}/messages, PATCH /tickets/{id}/reopen.
 * Первым сообщением идёт описание. В открытое обращение можно писать, в закрытое нельзя (409): его переоткрывают
 * в течение 7 дней, потом создают новое. Ответы поддержки приходят уведомлением ticket_message.
 */
export default function TicketPage() {
    const { ticketId = '' } = useParams()
    const cabinet = cabinetOf(useLocation().pathname)
    const base = supportBase(cabinet)
    const { data: ticket, isPending, isError, error, refetch } = useTicket(ticketId)
    const now = useNow(60_000)
    const items = useMemo(() => (ticket ? conversation(ticket) : []), [ticket])
    const endRef = useRef<HTMLDivElement>(null)
    const seen = useRef<number | null>(null)

    // новое сообщение: прокручиваем вниз (при первой загрузке не трогаем)
    useEffect(() => {
        if (!ticket) return
        if (seen.current !== null && items.length > seen.current) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        seen.current = items.length
    }, [ticket, items.length])

    if (isPending) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-10 pt-6" aria-hidden>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
                <Skeleton className="mt-3 h-16 w-3/4 rounded-2xl" />
            </div>
        )
    }

    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Обращение не найдено' : 'Не удалось загрузить обращение'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to={base} className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2">
                            Все обращения
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const reopen = reopenState(ticket, now)

    return (
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
            <Link to={base} className="text-sm text-muted underline hover:opacity-80">
                Все обращения
            </Link>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-fg">{ticket.subject}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full ${ticket.status === 'open' ? 'bg-primary' : 'bg-line'}`} />
            {STATUS_LABEL[ticket.status]}
        </span>
                <span aria-hidden>·</span>
                <span>{CATEGORY_LABEL[ticket.category]}</span>
                {ticket.priority === 'urgent' && (
                    <>
                        <span aria-hidden>·</span>
                        <span className="font-semibold text-danger">{PRIORITY_LABEL.urgent}</span>
                    </>
                )}
                <span aria-hidden>·</span>
                <span>создано {formatDateTime(ticket.createdAt)}</span>
            </p>

            <ol aria-label="Переписка" className="mt-5 space-y-3">
                {items.map((m) => (
                    <MessageBubble key={m.id} item={m} now={now} />
                ))}
            </ol>
            <div ref={endRef} />

            <div className="mt-6">
                {ticket.status === 'open' ? <Composer ticketId={ticket.id} /> : <ReopenBox ticketId={ticket.id} state={reopen} newTicketTo={`${base}/new`} />}
            </div>
        </div>
    )
}