import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { useSendMessage } from '../hooks'
import { TEXT_MAX } from '../schema'

/** Поле ответа в открытом обращении. Отправка по кнопке или Ctrl/Cmd+Enter. Текст очищается только после успеха. */
export function Composer({ ticketId }: { ticketId: string }) {
  const [text, setText] = useState('')
  const send = useSendMessage(ticketId)
  const trimmed = text.trim()

  function submit() {
    if (!trimmed || send.isPending) return
    send.mutate(trimmed, { onSuccess: () => setText('') })
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <label htmlFor="ticket-reply" className="sr-only">
        Сообщение
      </label>
      <textarea
        id="ticket-reply"
        value={text}
        maxLength={TEXT_MAX}
        rows={3}
        placeholder="Напишите сообщение"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            submit()
          }
        }}
        className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{text.length > TEXT_MAX - 500 ? `${text.length} из ${TEXT_MAX}` : 'Ctrl+Enter: отправить'}</span>
        <Button variant="dark" disabled={!trimmed} loading={send.isPending} onClick={submit} className="sm:w-auto">
          Отправить
        </Button>
      </div>
    </div>
  )
}
