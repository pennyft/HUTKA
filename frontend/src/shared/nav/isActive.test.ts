import { describe, expect, it } from 'vitest'
import { Car } from 'lucide-react'
import { isActive, underPath } from './isActive'
import { catalogMatch, tripsMatch } from './entries'

const base = { label: 'x', icon: Car }

describe('underPath', () => {
  it('совпадает с самим путём и вложенными', () => {
    expect(underPath('/partner/payouts')('/partner/payouts')).toBe(true)
    expect(underPath('/partner/payouts')('/partner/payouts/123')).toBe(true)
  })
  it('не цепляет соседний путь с общим началом', () => {
    expect(underPath('/partner/payouts')('/partner/payout-details')).toBe(false)
  })
})

describe('isActive', () => {
  it('корень с end активен только на точном пути', () => {
    const e = { ...base, to: '/partner', end: true }
    expect(isActive(e, '/partner')).toBe(true)
    expect(isActive(e, '/partner/cars')).toBe(false)
  })
  it('обычный пункт активен на вложенных страницах', () => {
    expect(isActive({ ...base, to: '/admin/users' }, '/admin/users/42')).toBe(true)
  })
  it('закрытый пункт не подсвечивается', () => {
    expect(isActive({ ...base, to: '/app/pdd', locked: true }, '/app/pdd')).toBe(false)
  })
})

describe('каталог и поездки', () => {
  it('форма брони относится к каталогу, а не к «Моим поездкам»', () => {
    expect(catalogMatch('/app/bookings/new')).toBe(true)
    expect(tripsMatch('/app/bookings/new')).toBe(false)
  })
  it('карточка машины и детали брони', () => {
    expect(catalogMatch('/cars/abc')).toBe(true)
    expect(tripsMatch('/app/bookings')).toBe(true)
    expect(tripsMatch('/app/bookings/abc')).toBe(true)
  })
})
