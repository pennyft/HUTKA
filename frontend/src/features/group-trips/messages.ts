import type { InfiniteData } from '@tanstack/react-query'
import type { ChatHistory, ChatMessage } from './types'

/**
 * Страницы истории приходят новыми первыми (page 0 самая свежая). Для показа нужен порядок «старые сверху»:
 * разворачиваем страницы и сообщения внутри них. Если пока грузилась история, пришли новые сообщения, границы
 * страниц сдвигаются, и одно сообщение может попасть в две страницы, поэтому убираем повторы по id.
 */
export function flattenHistory(pages: ChatHistory[]): ChatMessage[] {
  const seen = new Set<string>()
  const out: ChatMessage[] = []
  for (const page of [...pages].reverse()) {
    for (const m of [...page.items].reverse()) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      out.push(m)
    }
  }
  return out
}

/** Добавляет пришедшее по сокету сообщение в самое начало первой страницы (она новыми первыми). Повтор игнорируется. */
export function prependLive(data: InfiniteData<ChatHistory> | undefined, msg: ChatMessage): InfiniteData<ChatHistory> | undefined {
  if (!data || data.pages.length === 0) return data
  if (data.pages.some((p) => p.items.some((m) => m.id === msg.id))) return data
  const [first, ...rest] = data.pages
  return { ...data, pages: [{ total: first.total + 1, items: [msg, ...first.items] }, ...rest] }
}

export interface DayGroup {
  key: string
  label: string
  items: ChatMessage[]
}

const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

/** Группировка по дням для разделителей «Сегодня», «Вчера», «20 октября» (в часовом поясе браузера). */
export function groupByDay(messages: ChatMessage[], now: Date = new Date()): DayGroup[] {
  const today = dayKey(now.toISOString())
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000).toISOString())
  const groups: DayGroup[] = []
  for (const m of messages) {
    const key = dayKey(m.createdAt)
    const last = groups.at(-1)
    if (last && last.key === key) {
      last.items.push(m)
      continue
    }
    const label =
      key === today
        ? 'Сегодня'
        : key === yesterday
          ? 'Вчера'
          : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(m.createdAt))
    groups.push({ key, label, items: [m] })
  }
  return groups
}

export function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** Разбор тела сообщения из сокета. Битое или неполное тело отбрасываем, а не роняем чат. */
export function parseChatMessage(body: string): ChatMessage | null {
  try {
    const m = JSON.parse(body) as Partial<ChatMessage>
    if (typeof m.id !== 'string' || typeof m.body !== 'string' || typeof m.createdAt !== 'string') return null
    return { id: m.id, tripId: m.tripId ?? '', senderId: m.senderId ?? null, senderName: m.senderName ?? null, body: m.body, createdAt: m.createdAt }
  } catch {
    return null
  }
}

/** Разбор ошибки из /user/queue/errors ({status, message}); если формат неожиданный, общий текст. */
export function parseChatError(body: string): string {
  try {
    const e = JSON.parse(body) as { message?: unknown }
    if (typeof e.message === 'string' && e.message) return e.message
  } catch {
    // не JSON
  }
  return 'Не удалось отправить сообщение'
}
