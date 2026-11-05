import { describe, expect, it } from 'vitest'
import { canSubmitPhotos, startHint } from './logic'

const at = (h: number, m = 0) => new Date(2026, 9, 22, h, m)
const b = (confirmed = true) => ({ status: 'pending' as const, confirmedAt: confirmed ? at(9).toISOString() : null, plannedStartAt: at(10).toISOString() })

describe('подсказка к старту поездки', () => {
  it('до планового времени: когда можно начать', () => {
    expect(startHint(b(), at(9, 30))).toEqual({ kind: 'wait', from: at(10) })
  })
  it('не подтверждена партнёром: начать нельзя', () => {
    expect(startHint(b(false), at(10, 30)).kind).toBe('wait')
  })
  it('время пришло: до какого момента начать (час после старта)', () => {
    expect(startHint(b(), at(10, 5))).toEqual({ kind: 'deadline', until: at(11) })
    expect(startHint(b(), at(11))).toEqual({ kind: 'deadline', until: at(11) })
  })
  it('час прошёл: бэк вот-вот отменит бронь', () => {
    expect(startHint(b(), at(11, 1))).toEqual({ kind: 'expired' })
  })
})

describe('отправка фото', () => {
  it('нужна хотя бы одна загруженная и никакая не должна грузиться', () => {
    expect(canSubmitPhotos(0, false)).toBe(false)
    expect(canSubmitPhotos(1, false)).toBe(true)
    expect(canSubmitPhotos(3, true)).toBe(false)
    expect(canSubmitPhotos(20, false)).toBe(true)
    expect(canSubmitPhotos(21, false)).toBe(false)
  })
})
