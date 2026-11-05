import { describe, expect, it } from 'vitest'
import { HISTORY_SEND, buildHistory, cabinetFor, pageContext, ticketPath } from './logic'
import { useAiStore } from './store'
import type { ChatEntry } from './types'

const e = (over: Partial<ChatEntry>): ChatEntry => ({ id: 'x', role: 'user', text: 'привет', ...over })

describe('cabinetFor', () => {
  it('партнёрские адреса', () => {
    expect(cabinetFor('/partner')).toBe('partner')
    expect(cabinetFor('/partner/cars')).toBe('partner')
  })
  it('остальное арендатор, включая похожий префикс', () => {
    expect(cabinetFor('/app/bookings')).toBe('renter')
    expect(cabinetFor('/cars/abc')).toBe('renter')
    expect(cabinetFor('/partnership')).toBe('renter')
  })
})

describe('pageContext', () => {
  it('оставляет символы адреса и режет до 100', () => {
    expect(pageContext('/app/bookings/abc-123')).toBe('/app/bookings/abc-123')
    expect(pageContext('/app/маршрут/x')).toBe('/app//x')
    expect(pageContext('/' + 'a'.repeat(200))).toHaveLength(100)
  })
  it('пустое не отправляем', () => {
    expect(pageContext('')).toBeUndefined()
    expect(pageContext('кириллица')).toBeUndefined()
  })
})

describe('buildHistory', () => {
  it('без сообщений о сбоях и пустых реплик', () => {
    const h = buildHistory([e({ text: 'a' }), e({ role: 'assistant', text: 'сбой', failed: true }), e({ text: '   ' }), e({ role: 'assistant', text: 'b' })])
    expect(h).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ])
  })
  it('только последние реплики и не длиннее 2000 символов', () => {
    const many = Array.from({ length: HISTORY_SEND + 5 }, (_, i) => e({ text: `m${i}` }))
    const h = buildHistory(many)
    expect(h).toHaveLength(HISTORY_SEND)
    expect(h.at(-1)?.content).toBe(`m${HISTORY_SEND + 4}`)
    expect(buildHistory([e({ text: 'x'.repeat(3000) })])[0].content).toHaveLength(2000)
  })
})

describe('ticketPath', () => {
  it('по кабинету', () => {
    expect(ticketPath('renter', 't1')).toBe('/app/support/t1')
    expect(ticketPath('partner', 't1')).toBe('/partner/support/t1')
  })
})

describe('store', () => {
  it('добавляет, обновляет, удаляет и очищается при смене владельца', () => {
    const s = useAiStore.getState()
    s.reset('tokenA')
    s.add(e({ id: '1' }))
    s.update('1', { text: 'новый' })
    expect(useAiStore.getState().entries[0].text).toBe('новый')
    s.remove('1')
    expect(useAiStore.getState().entries).toHaveLength(0)
    s.add(e({ id: '2' }))
    s.reset('tokenB')
    expect(useAiStore.getState().entries).toHaveLength(0)
    expect(useAiStore.getState().owner).toBe('tokenB')
  })
})
