import type { InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { flattenHistory, groupByDay, parseChatError, parseChatMessage, prependLive } from './messages'
import type { ChatHistory, ChatMessage } from './types'

const msg = (id: string, createdAt: string, body = id): ChatMessage => ({ id, tripId: 't', senderId: 'u', senderName: 'Иван П.', body, createdAt })

describe('flattenHistory', () => {
  it('старые сверху, новые снизу', () => {
    const page0: ChatHistory = { total: 4, items: [msg('4', '2026-10-20T12:03:00Z'), msg('3', '2026-10-20T12:02:00Z')] }
    const page1: ChatHistory = { total: 4, items: [msg('2', '2026-10-20T12:01:00Z'), msg('1', '2026-10-20T12:00:00Z')] }
    expect(flattenHistory([page0, page1]).map((m) => m.id)).toEqual(['1', '2', '3', '4'])
  })
  it('убирает повтор, попавший в две страницы после сдвига', () => {
    const page0: ChatHistory = { total: 3, items: [msg('3', '2026-10-20T12:02:00Z'), msg('2', '2026-10-20T12:01:00Z')] }
    const page1: ChatHistory = { total: 3, items: [msg('2', '2026-10-20T12:01:00Z'), msg('1', '2026-10-20T12:00:00Z')] }
    expect(flattenHistory([page0, page1]).map((m) => m.id)).toEqual(['1', '2', '3'])
  })
})

describe('prependLive', () => {
  const data: InfiniteData<ChatHistory> = { pageParams: [0], pages: [{ total: 1, items: [msg('1', '2026-10-20T12:00:00Z')] }] }
  it('кладёт новое сообщение в начало первой страницы', () => {
    const next = prependLive(data, msg('2', '2026-10-20T12:01:00Z'))
    expect(next?.pages[0].items.map((m) => m.id)).toEqual(['2', '1'])
    expect(next?.pages[0].total).toBe(2)
  })
  it('повтор игнорирует (своё сообщение пришло и из истории, и из сокета)', () => {
    expect(prependLive(data, msg('1', '2026-10-20T12:00:00Z'))).toBe(data)
  })
  it('пока история не загружена, ничего не делает', () => {
    expect(prependLive(undefined, msg('1', '2026-10-20T12:00:00Z'))).toBeUndefined()
  })
})

describe('groupByDay', () => {
  it('Сегодня, Вчера и дата', () => {
    const now = new Date(2026, 9, 20, 15, 0)
    const groups = groupByDay(
      [msg('a', new Date(2026, 9, 18, 10, 0).toISOString()), msg('b', new Date(2026, 9, 19, 10, 0).toISOString()), msg('c', new Date(2026, 9, 20, 9, 0).toISOString()), msg('d', new Date(2026, 9, 20, 10, 0).toISOString())],
      now,
    )
    expect(groups.map((g) => g.label)).toEqual(['18 октября', 'Вчера', 'Сегодня'])
    expect(groups[2].items.map((m) => m.id)).toEqual(['c', 'd'])
  })
})

describe('parse', () => {
  it('сообщение из сокета', () => {
    const m = parseChatMessage('{"id":"1","tripId":"t","senderId":"u","senderName":"Иван П.","body":"привет","createdAt":"2026-10-20T12:00:00Z"}')
    expect(m?.body).toBe('привет')
  })
  it('битое тело отбрасывается', () => {
    expect(parseChatMessage('не json')).toBeNull()
    expect(parseChatMessage('{"id":1}')).toBeNull()
  })
  it('ошибка: текст сервера или общий', () => {
    expect(parseChatError('{"status":409,"message":"Чат закрыт"}')).toBe('Чат закрыт')
    expect(parseChatError('???')).toBe('Не удалось отправить сообщение')
  })
})
