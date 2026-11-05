import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'
import { useAiSend } from '../hooks'
import { MESSAGE_MAX, STARTERS } from '../logic'
import { useAiStore } from '../store'
import type { AiCabinet } from '../types'
import { AiMessage } from './AiMessage'

/**
 * Окно помощника. На телефоне занимает весь экран, на компьютере окно в правом нижнем углу. Лента сама прокручивается
 * к последнему сообщению. Enter отправляет, Shift+Enter переносит строку, Esc закрывает окно.
 */
export function AiPanel({ cabinet, onClose, onNavigate }: { cabinet: AiCabinet; onClose: () => void; onNavigate: () => void }) {
  const entries = useAiStore((s) => s.entries)
  const { send, retry, pending } = useAiSend()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length, pending])

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!text.trim() || pending) return
    void send(text)
    setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Помощник Hutka"
      id="ai-panel"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="fixed inset-0 z-50 flex flex-col bg-bg sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[36rem] sm:max-h-[calc(100dvh-3rem)] sm:w-[24rem] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-line sm:shadow-pop"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
        <div>
          <h2 className="font-semibold text-fg">Помощник</h2>
          <p className="text-xs text-muted">Ответы ИИ могут быть неточными</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть помощника" className="flex size-9 items-center justify-center rounded-xl text-fg transition-colors hover:bg-surface-2">
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite" aria-label="Переписка с помощником">
        {entries.length === 0 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted">
              Помогу подобрать машину, отвечу на вопросы о платформе и подскажу, что делать в дороге. Если не справлюсь, предложу обращение в поддержку.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg transition-colors hover:bg-surface-2">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry) => (
          <AiMessage key={entry.id} entry={entry} cabinet={cabinet} onRetry={retry} onNavigate={onNavigate} />
        ))}
        {pending && (
          <p className="inline-block animate-pulse rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2 text-sm text-muted">Помощник печатает…</p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
        <div className="flex items-end gap-2">
          <label htmlFor="ai-input" className="sr-only">
            Сообщение помощнику
          </label>
          <textarea
            id="ai-input"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MESSAGE_MAX}
            rows={1}
            placeholder="Спросите о чём угодно"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted [field-sizing:content] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || pending}
            aria-label="Отправить"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="size-[18px]" aria-hidden />
          </button>
        </div>
        {text.length > 1800 && (
          <p className="mt-1 text-right text-xs text-muted">
            {text.length} / {MESSAGE_MAX}
          </p>
        )}
      </form>
    </div>
  )
}
