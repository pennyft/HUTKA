import { useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Skeleton } from '@/shared/ui/Skeleton'
import { flattenHistory, formatMessageTime, groupByDay } from '../messages'
import { MESSAGE_MAX } from '../rules'
import { useTripChat } from '../hooks'

interface Props {
  tripId: string
  meId: string | undefined
  /** Можно ли писать: поездка открыта или закрыта для набора и не прошла */
  writable: boolean
  className?: string
}

/**
 * Чат групповой поездки (B18). Старые сообщения сверху, новые снизу. Лента сама прокручивается вниз, пока вы у конца
 * (или только что отправили сообщение); при подгрузке более ранних сообщений положение не прыгает.
 * Enter отправляет, Shift+Enter переносит строку.
 */
export function TripChat({ tripId, meId, writable, className = '' }: Props) {
  const { history, status, error, send } = useTripChat(tripId)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const prevHeight = useRef(0)
  const prevFirst = useRef<string | undefined>(undefined)
  const prevLast = useRef<string | undefined>(undefined)

  const messages = useMemo(() => flattenHistory(history.data?.pages ?? []), [history.data])
  const groups = useMemo(() => groupByDay(messages), [messages])
  const firstId = messages[0]?.id
  const lastId = messages.at(-1)?.id

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (prevFirst.current && firstId !== prevFirst.current && lastId === prevLast.current) {
      // сверху добавились более ранние сообщения: оставляем то, на что смотрели, на месте
      el.scrollTop += el.scrollHeight - prevHeight.current
    } else if (lastId !== prevLast.current && stick.current) {
      el.scrollTop = el.scrollHeight
    }
    prevHeight.current = el.scrollHeight
    prevFirst.current = firstId
    prevLast.current = lastId
  }, [firstId, lastId])

  const connected = status === 'connected'
  const canSend = writable && connected && text.trim().length > 0 && text.length <= MESSAGE_MAX

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    stick.current = true
    if (send(text)) setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section aria-label="Чат поездки" className={`flex min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="font-semibold text-fg">Чат поездки</h2>
        <p className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          <span aria-hidden className={`size-1.5 rounded-full ${connected ? 'bg-primary' : 'animate-pulse bg-muted'}`} />
          {connected ? 'На связи' : 'Подключаемся…'}
        </p>
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-label="Сообщения"
      >
        {history.isPending ? (
          <div className="space-y-3" aria-hidden>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : history.isError ? (
          <div className="py-6 text-center text-sm text-muted">
            <p>Не удалось загрузить историю: {errorMessage(history.error)}</p>
            <button type="button" onClick={() => history.refetch()} className="mt-2 font-medium text-fg underline hover:opacity-80">
              Повторить
            </button>
          </div>
        ) : (
          <>
            {history.hasNextPage && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  disabled={history.isFetchingNextPage}
                  onClick={() => history.fetchNextPage()}
                  className="rounded-full border border-line px-3.5 py-1.5 text-xs text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  {history.isFetchingNextPage ? 'Загружаем…' : 'Показать более ранние'}
                </button>
              </div>
            )}
            {messages.length === 0 && <p className="py-8 text-center text-sm text-muted">Сообщений пока нет. Напишите первым.</p>}
            {groups.map((g) => (
              <div key={g.key}>
                <p className="my-2 text-center text-xs text-muted">{g.label}</p>
                {g.items.map((m, i) => {
                  const mine = !!meId && m.senderId === meId
                  const showName = !mine && g.items[i - 1]?.senderId !== m.senderId
                  return (
                    <div key={m.id} className={`mt-1 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-primary text-primary-fg' : 'rounded-bl-md border border-line bg-surface'}`}>
                        {showName && <p className="mb-0.5 text-xs font-semibold text-fg">{m.senderName ?? 'Участник'}</p>}
                        <p className={`whitespace-pre-wrap break-words ${mine ? '' : 'text-fg'}`}>{m.body}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-primary-fg/70' : 'text-muted'}`}>{formatMessageTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="border-t border-line bg-surface-2 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="border-t border-line p-3">
        {writable ? (
          <div className="flex items-end gap-2">
            <label htmlFor={`chat-input-${tripId}`} className="sr-only">
              Сообщение
            </label>
            <textarea
              id={`chat-input-${tripId}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MESSAGE_MAX}
              rows={1}
              placeholder="Сообщение"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted [field-sizing:content] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Отправить сообщение"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="size-[18px]" aria-hidden />
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted">Чат закрыт для новых сообщений: поездка завершена или отменена. История доступна для чтения.</p>
        )}
        {writable && text.length > 800 && (
          <p className="mt-1 text-right text-xs text-muted">
            {text.length} / {MESSAGE_MAX}
          </p>
        )}
        {writable && !connected && <p className="mt-1 text-xs text-muted">Отправка станет доступна после подключения.</p>}
      </form>
    </section>
  )
}
