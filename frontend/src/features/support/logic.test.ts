import { describe, expect, it } from 'vitest'
import { cabinetOf, conversation, draftToValues, parseStatusFilter, readDraft, reopenState, supportBase, toApiStatus } from './logic'
import type { TicketDetail } from './types'

const ticket = (over: Partial<TicketDetail> = {}): TicketDetail => ({
  id: 't1',
  audience: 'renter',
  subject: 'Не списались деньги',
  category: 'payment',
  priority: 'normal',
  status: 'open',
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  closedAt: null,
  reopenedAt: null,
  canReopen: false,
  reopenableUntil: null,
  description: 'Описание проблемы',
  messages: [],
  ...over,
})

describe('кабинет и адреса', () => {
  it('кабинет по адресу', () => {
    expect(cabinetOf('/partner/support')).toBe('partner')
    expect(cabinetOf('/partner/support/abc')).toBe('partner')
    expect(cabinetOf('/app/support')).toBe('renter')
  })
  it('базовые адреса совпадают со ссылками из уведомлений', () => {
    expect(supportBase('renter')).toBe('/app/support')
    expect(supportBase('partner')).toBe('/partner/support')
  })
})

describe('фильтр', () => {
  it('разбор параметра', () => {
    expect(parseStatusFilter('open')).toBe('open')
    expect(parseStatusFilter('closed')).toBe('closed')
    expect(parseStatusFilter('мусор')).toBe('all')
    expect(parseStatusFilter(null)).toBe('all')
  })
  it('для бэка «все» это отсутствие параметра', () => {
    expect(toApiStatus('all')).toBeUndefined()
    expect(toApiStatus('closed')).toBe('closed')
  })
})

describe('переписка', () => {
  it('первым идёт описание от пользователя, дальше сообщения по порядку', () => {
    const t = ticket({
      messages: [
        { id: 'm1', authorType: 'admin', body: 'Смотрим', createdAt: '2026-10-20T11:00:00Z' },
        { id: 'm2', authorType: 'user', body: 'Спасибо', createdAt: '2026-10-20T12:00:00Z' },
      ],
    })
    const c = conversation(t)
    expect(c.map((m) => m.id)).toEqual(['description', 'm1', 'm2'])
    expect(c[0]).toMatchObject({ authorType: 'user', body: 'Описание проблемы', createdAt: t.createdAt })
  })
  it('без сообщений только описание', () => {
    expect(conversation(ticket())).toHaveLength(1)
  })
})

describe('переоткрытие', () => {
  const now = new Date('2026-10-22T10:00:00Z')
  it('открытый тикет не переоткрывается', () => {
    expect(reopenState(ticket(), now)).toEqual({ kind: 'not_closed' })
  })
  it('закрыт, срок не вышел', () => {
    const t = ticket({ status: 'closed', canReopen: true, reopenableUntil: '2026-10-25T10:00:00Z' })
    expect(reopenState(t, now)).toEqual({ kind: 'can', until: '2026-10-25T10:00:00Z' })
  })
  it('сервер сказал нельзя', () => {
    expect(reopenState(ticket({ status: 'closed', canReopen: false, reopenableUntil: '2026-10-10T10:00:00Z' }), now)).toEqual({ kind: 'expired' })
  })
  it('страница лежала открытой и срок прошёл уже на клиенте', () => {
    const t = ticket({ status: 'closed', canReopen: true, reopenableUntil: '2026-10-22T09:59:00Z' })
    expect(reopenState(t, now)).toEqual({ kind: 'expired' })
  })
  it('граница включительно, как на бэке', () => {
    const t = ticket({ status: 'closed', canReopen: true, reopenableUntil: '2026-10-22T10:00:00Z' })
    expect(reopenState(t, now).kind).toBe('can')
  })
})

describe('черновик от AI', () => {
  it('значения формы из черновика', () => {
    expect(draftToValues({ category: 'dispute', subject: 'Тема', description: 'Текст', priority: 'urgent' })).toEqual({
      category: 'dispute',
      subject: 'Тема',
      description: 'Текст',
      urgent: true,
    })
  })
  it('пусто и неизвестная категория', () => {
    expect(draftToValues(null)).toEqual({ category: '', subject: '', description: '', urgent: false })
    expect(draftToValues({ category: 'nonsense' as never }).category).toBe('')
  })
  it('черновик читается из location.state, не доверяя форме', () => {
    expect(readDraft({ draft: { subject: 'x' } })).toEqual({ subject: 'x' })
    expect(readDraft(null)).toBeNull()
    expect(readDraft({ draft: 'строка' })).toBeNull()
    expect(readDraft({ other: 1 })).toBeNull()
  })
})
