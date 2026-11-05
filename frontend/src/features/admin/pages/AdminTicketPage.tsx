import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { CATEGORY_LABEL } from '@/features/support/labels'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Pill } from '../components/Pills'
import { useAdminTicket, useCloseTicket, useReplyTicket } from '../tickets/hooks'
import { AUDIENCE_LABEL, authorLabel, conversation, REPLY_MAX, replyProblem, waitingText } from '../tickets/logic'

/**
 * AD17. Тикет: автор, история переписки (пользователь, администратор, AI), поле ответа и кнопка «Закрыть». После ответа пользователь получает
 * ticket_message, после закрытия ticket_closed и 7 дней на переоткрытие. У системных тикетов (например при страйках) получателя уведомления нет.
 * Менять приоритет и создавать тикеты админ не может. 409: в закрытый тикет писать нельзя, закрыть можно только открытый.
 */
export default function AdminTicketPage() {
  const { ticketId = '' } = useParams()
  const { data: t, isPending, isError, error, refetch } = useAdminTicket(ticketId)
  const reply = useReplyTicket(ticketId)
  const close = useCloseTicket(ticketId)
  const now = useNow(60_000)
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const items = useMemo(() => (t ? conversation(t) : []), [t])

  if (isPending) return <div className="mx-auto max-w-3xl space-y-3 px-4 pt-6"><Skeleton className="h-10 w-2/3" aria-hidden /><Skeleton className="h-72 rounded-3xl" aria-hidden /></div>
  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h1 className="text-lg font-bold text-fg">{notFound ? 'Обращение не найдено' : 'Не удалось загрузить обращение'}</h1>
          <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
          <div className="mt-5 flex gap-3">
            {!notFound && (
              <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                Повторить
              </Button>
            )}
            <Link to="/admin/tickets" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
              Все обращения
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const open = t.status === 'open'
  const waiting = waitingText(t.awaitingAdminSince, now)

  function send() {
    const p = replyProblem(text)
    setProblem(p)
    if (p) return
    reply.mutate(text.trim(), { onSuccess: () => setText('') })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-6">
      <div>
        <Link to="/admin/tickets" className="text-sm text-muted underline hover:opacity-80">
          Все обращения
        </Link>
        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-fg">{t.subject}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <Pill>{open ? 'Открыто' : 'Закрыто'}</Pill>
          {t.priority === 'urgent' && <Pill warn>Срочное</Pill>}
          <Pill>{CATEGORY_LABEL[t.category]}</Pill>
          <Pill>{AUDIENCE_LABEL[t.audience]}</Pill>
          <span>создано {formatDateTime(t.createdAt)}</span>
        </p>
        {waiting && <p className="mt-1 text-sm font-medium text-danger">{waiting}</p>}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5">
        <h2 className="mb-1 font-bold text-fg">Автор</h2>
        {t.requester ? (
          <dl className="text-sm">
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted">Имя</dt>
              <dd className="font-medium text-fg">
                <Link to={`/admin/users/${t.requester.id}`} className="underline hover:opacity-80">
                  {t.requester.name ?? 'профиль'}
                </Link>
                {t.requester.partner && <span className="ml-2 text-xs text-muted">партнёр</span>}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted">Контакты</dt>
              <dd className="break-words text-right font-medium text-fg">{[t.requester.email, t.requester.phone].filter(Boolean).join(', ') || '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">Системное обращение: у него нет автора, ответ пользователь не получит.</p>
        )}
      </section>

      <ol aria-label="Переписка" className="space-y-3">
        {items.map((m) => {
          const mine = m.authorType === 'admin'
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-accent text-accent-fg' : 'border border-line bg-surface text-fg'}`}>
                <p className={`text-xs font-semibold ${mine ? 'text-accent-fg' : 'text-muted'}`}>
                  {authorLabel(m)} <span className="font-normal opacity-80">· {formatDateTime(m.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {open ? (
        <section className="space-y-3 rounded-3xl border border-line bg-surface p-4">
          <label htmlFor="admin-reply" className="block text-xs font-medium text-fg">
            Ответ
          </label>
          <textarea
            id="admin-reply"
            value={text}
            rows={4}
            maxLength={REPLY_MAX}
            onChange={(e) => {
              setText(e.target.value)
              setProblem(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                send()
              }
            }}
            className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {problem && <p role="alert" className="text-xs text-danger">{problem}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">Ctrl+Enter: отправить</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={reply.isPending || close.isPending} onClick={() => setConfirming(true)} className="sm:w-auto">
                Закрыть обращение
              </Button>
              <Button variant="dark" loading={reply.isPending} onClick={send} className="sm:w-auto">
                Ответить
              </Button>
            </div>
          </div>
          {confirming && (
            <div className="rounded-2xl border border-line bg-surface-2 p-3">
              <p className="text-sm text-fg">Закрыть обращение? Пользователь получит уведомление и 7 дней на переоткрытие.</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button variant="dark" loading={close.isPending} onClick={() => close.mutate(undefined, { onSettled: () => setConfirming(false) })}>
                  Закрыть
                </Button>
                <Button variant="outline" disabled={close.isPending} onClick={() => setConfirming(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-surface p-5 text-sm text-muted">
          Обращение закрыто {t.closedAt ? formatDateTime(t.closedAt) : ''}
          {t.closedByAdminName && <> администратором {t.closedByAdminName}</>}. Писать в закрытое обращение нельзя: пользователь может переоткрыть его в течение 7 дней.
          {t.reopenedAt && <> Ранее переоткрывалось {formatDateTime(t.reopenedAt)}.</>}
        </section>
      )}
    </div>
  )
}
