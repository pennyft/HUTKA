import { describe, expect, it } from 'vitest'
import { authorLabel, conversation, durationText, parseTicketFilters, replyProblem, ticketFiltersToParams, ticketFiltersToQuery, waitingText } from './logic'
import type { AdminTicketDetail } from './types'

describe('фильтры очереди', () => {
  it('из адреса и обратно', () => {
    const f = parseTicketFilters(new URLSearchParams('tab=closed&priority=urgent&category=payment&audience=partner&page=2'))
    expect(f).toEqual({ tab: 'closed', priority: 'urgent', category: 'payment', audience: 'partner', page: 1 })
    expect(ticketFiltersToParams(f)).toEqual({ tab: 'closed', priority: 'urgent', category: 'payment', audience: 'partner', page: '2' })
    expect(ticketFiltersToQuery(f)).toEqual({ status: 'closed', priority: 'urgent', category: 'payment', audience: 'partner', page: 1 })
  })
  it('по умолчанию открытые, мусор отбрасывается', () => {
    expect(parseTicketFilters(new URLSearchParams('tab=x&priority=high&category=none&audience=guest&page=0'))).toEqual({ tab: 'open', priority: '', category: '', audience: '', page: 0 })
    expect(ticketFiltersToParams({ tab: 'open', priority: '', category: '', audience: '', page: 0 })).toEqual({})
  })
})

describe('время', () => {
  it('длительность', () => {
    expect(durationText(null)).toBe('—')
    expect(durationText(45)).toBe('45 с')
    expect(durationText(12 * 60)).toBe('12 мин')
    expect(durationText(2 * 3600 + 15 * 60)).toBe('2 ч 15 мин')
    expect(durationText(27 * 3600)).toBe('1 д 3 ч')
  })
  it('сколько ждёт ответа', () => {
    const now = new Date('2026-10-25T12:00:00Z')
    expect(waitingText(null, now)).toBeNull()
    expect(waitingText('2026-10-25T11:59:40Z', now)).toBe('ждёт ответа меньше минуты')
    expect(waitingText('2026-10-25T08:50:00Z', now)).toBe('ждёт ответа 3 ч 10 мин')
  })
})

describe('переписка и ответ', () => {
  it('ответ обязателен, до 4000', () => {
    expect(replyProblem('  ')).toBe('Введите ответ')
    expect(replyProblem('a'.repeat(4000))).toBeNull()
    expect(replyProblem('a'.repeat(4001))).toMatch(/4000/)
  })
  it('первым идёт описание от автора', () => {
    const t = {
      requester: { id: 'u', name: 'Иван', email: null, phone: null, partner: false },
      description: 'Не списались деньги',
      createdAt: '2026-10-25T10:00:00Z',
      messages: [{ id: 'm1', authorType: 'admin', authorId: 'a', authorName: 'Анна', body: 'Смотрим', createdAt: '2026-10-25T11:00:00Z' }],
    } as unknown as AdminTicketDetail
    const c = conversation(t)
    expect(c.map((m) => m.id)).toEqual(['description', 'm1'])
    expect(c[0]).toMatchObject({ authorType: 'user', authorName: 'Иван', body: 'Не списались деньги' })
  })
  it('подписи авторов', () => {
    expect(authorLabel({ authorType: 'ai', authorName: null })).toBe('AI-помощник')
    expect(authorLabel({ authorType: 'admin', authorName: null })).toBe('Поддержка')
    expect(authorLabel({ authorType: 'admin', authorName: 'Анна' })).toBe('Анна')
    expect(authorLabel({ authorType: 'user', authorName: null })).toBe('Пользователь')
  })
})
