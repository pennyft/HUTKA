import type { AiCabinet, ChatEntry } from './types'

export const MESSAGE_MAX = 2000
/** Сколько последних реплик отправляем в историю (бэк принимает до 40 и использует последние 10). */
export const HISTORY_SEND = 20

export const STARTERS = ['Подобрать машину', 'Как работает бронирование?', 'Что делать, если машина сломалась в пути?']

/** Кабинет по адресу: у партнёра другой набор подсказок и тикеты уходят с audience = partner. */
export function cabinetFor(pathname: string): AiCabinet {
  return pathname === '/partner' || pathname.startsWith('/partner/') ? 'partner' : 'renter'
}

/**
 * Текущая страница для контекста помощника. Бэк оставляет только символы адреса и режет до 100 (AiRules.sanitizePage),
 * делаем то же заранее; пустое значение не отправляем.
 */
export function pageContext(pathname: string): string | undefined {
  const cleaned = pathname.replace(/[^A-Za-z0-9/_\-.:?=&# ]/g, '').trim().slice(0, 100)
  return cleaned || undefined
}

/** История для запроса: только реплики user/assistant с текстом, без сообщений о сбоях, не длиннее лимита. */
export function buildHistory(entries: ChatEntry[]): { role: 'user' | 'assistant'; content: string }[] {
  return entries
    .filter((e) => !e.failed && e.text.trim().length > 0)
    .map((e) => ({ role: e.role, content: e.text.slice(0, MESSAGE_MAX) }))
    .slice(-HISTORY_SEND)
}

export function ticketPath(cabinet: AiCabinet, id: string): string {
  return `${cabinet === 'partner' ? '/partner' : '/app'}/support/${id}`
}

let counter = 0
/** Идентификатор реплики (локальный, на сервер не уходит). */
export function entryId(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter}`
}
