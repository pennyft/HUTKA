import { useState } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { useReopenTicket } from '../hooks'
import type { ReopenState } from '../logic'
import { TEXT_MAX } from '../schema'

interface Props {
  ticketId: string
  state: ReopenState
  /** Адрес формы нового обращения своего кабинета. */
  newTicketTo: string
}

/**
 * Блок под закрытым обращением. Пока срок в 7 дней не истёк: кнопка «Переоткрыть» с необязательным пояснением
 * (оно попадёт в переписку). После срока: только создание нового обращения.
 */
export function ReopenBox({ ticketId, state, newTicketTo }: Props) {
  const [asking, setAsking] = useState(false)
  const [message, setMessage] = useState('')
  const reopen = useReopenTicket(ticketId)

  if (state.kind === 'not_closed') return null

  if (state.kind === 'expired') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-fg">Обращение закрыто, срок переоткрытия (7 дней) истёк.</p>
        <Link to={newTicketTo} className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
          Создать новое обращение
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-fg">
        Обращение закрыто.{state.until && <> Переоткрыть можно до {formatDateTime(state.until)}.</>}
      </p>
      {asking ? (
        <div className="mt-3">
          <label htmlFor="reopen-message" className="mb-1.5 block text-xs font-medium text-fg">
            Что изменилось? (необязательно)
          </label>
          <textarea
            id="reopen-message"
            value={message}
            maxLength={TEXT_MAX}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="dark" loading={reopen.isPending} onClick={() => reopen.mutate(message.trim() || undefined)}>
              Переоткрыть
            </Button>
            <Button variant="outline" disabled={reopen.isPending} onClick={() => setAsking(false)}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button variant="outline" onClick={() => setAsking(true)} className="sm:w-auto">
            Переоткрыть обращение
          </Button>
        </div>
      )}
    </div>
  )
}
