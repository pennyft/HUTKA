import { describe, expect, it } from 'vitest'
import { bookingFiltersToParams, bookingFiltersToQuery, forceCloseState, isUuid, parseBookingFilters, shortId, timelineLabel } from './logic'

const ID = '11111111-2222-3333-4444-555555555555'

describe('фильтры броней', () => {
  it('из адреса: UUID и даты проверяются, страница с 1', () => {
    const f = parseBookingFilters(new URLSearchParams(`status=active&carId=${ID}&userId=${ID}&from=2026-10-20&to=2026-10-22&page=3`))
    expect(f).toEqual({ status: 'active', carId: ID, renterId: '', userId: ID, from: '2026-10-20', to: '2026-10-22', page: 2 })
    expect(bookingFiltersToParams(f)).toEqual({ status: 'active', carId: ID, userId: ID, from: '2026-10-20', to: '2026-10-22', page: '3' })
  })
  it('мусор из ссылки отбрасывается', () => {
    expect(parseBookingFilters(new URLSearchParams('status=zzz&carId=123&from=вчера&page=-1'))).toEqual({ status: '', carId: '', renterId: '', userId: '', from: '', to: '', page: 0 })
    expect(isUuid('x')).toBe(false)
    expect(isUuid(ID.toUpperCase())).toBe(true)
  })
  it('запрос к API: последний день входит целиком', () => {
    const q = bookingFiltersToQuery({ status: 'finished', carId: '', renterId: '', userId: ID, from: '2026-10-20', to: '2026-10-22', page: 1 })
    expect(q.status).toBe('finished')
    expect(q.userId).toBe(ID)
    expect(q.page).toBe(1)
    expect(new Date(q.from!).getTime()).toBe(new Date(2026, 9, 20).getTime())
    expect(new Date(q.to!).getTime()).toBe(new Date(2026, 9, 23).getTime())
    expect(bookingFiltersToQuery({ status: '', carId: '', renterId: '', userId: '', from: '', to: '', page: 0 })).toEqual({ page: 0 })
  })
})

describe('принудительное закрытие', () => {
  const resolved = { id: 'd', status: 'resolved' as const, decision: 'partner_favor' as const, damageAmount: 0, createdAt: 'x', resolvedAt: 'y' }
  it('доступно: идёт, передана в спор, спор решён', () => {
    expect(forceCloseState({ status: 'active', escalatedAt: '2026-10-20T10:00:00Z', dispute: resolved })).toEqual({ kind: 'available' })
  })
  it('причины отказа по порядку проверок сервера', () => {
    expect(forceCloseState({ status: 'finished', escalatedAt: 'x', dispute: resolved })).toMatchObject({ kind: 'blocked', reason: expect.stringMatching(/идущую/) })
    expect(forceCloseState({ status: 'active', escalatedAt: null, dispute: null })).toMatchObject({ kind: 'blocked', reason: expect.stringMatching(/не передавалась/) })
    expect(forceCloseState({ status: 'active', escalatedAt: 'x', dispute: { ...resolved, status: 'open', decision: null } })).toMatchObject({ kind: 'blocked', reason: expect.stringMatching(/решите спор/) })
  })
})

describe('подписи', () => {
  it('события хронологии, незнакомое не теряется', () => {
    expect(timelineLabel('trip_started')).toBe('Поездка началась')
    expect(timelineLabel('new_event')).toBe('new_event')
    expect(shortId(ID)).toBe('11111111')
  })
})
