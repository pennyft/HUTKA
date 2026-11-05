import { describe, expect, it } from 'vitest'
import { adminCarBadges, carActions, hasDoubleHiding, inspectionState, parseCarTab, tabQuery } from './logic'
import type { AdminCar } from './types'

const car = (over: Partial<AdminCar> = {}): AdminCar => ({
  id: 'c1', partnerId: 'p1', partnerName: 'Иван', partnerEmail: 'i@x.by', make: 'Skoda', model: 'Octavia', year: 2020, plateNumber: '1234 AB-7',
  mileageKm: 80000, fuelType: 'petrol', transmission: 'auto', seats: 5, bodyType: 'Седан', address: 'Минск', pricePerHour: 12.5, description: null, photos: [],
  techPassportNumber: 'AA1', insurancePolicyNumber: 'BB2', inspectionExpiryDate: '2027-01-01', bookingMode: 'instant', moderationStatus: 'approved',
  rejectionReason: null, status: 'available', hidden: false, hiddenByStrikes: false, noShowStrikes: 0, createdAt: '2026-10-20T10:00:00Z', hiddenByAdmin: false, hiddenByAdminReason: null, ...over,
})

describe('вкладки', () => {
  it('вкладка в параметры запроса: булевы фильтры только для скрытых', () => {
    expect(tabQuery('pending')).toEqual({ moderationStatus: 'pending' })
    expect(tabQuery('rejected')).toEqual({ moderationStatus: 'rejected' })
    expect(tabQuery('strikes')).toEqual({ hiddenByStrikes: true })
    expect(tabQuery('admin')).toEqual({ hiddenByAdmin: true })
  })
  it('мусор в адресе даёт заявки', () => {
    expect(parseCarTab('approved')).toBe('approved')
    expect(parseCarTab('zzz')).toBe('pending')
    expect(parseCarTab(null)).toBe('pending')
  })
})

describe('метки и действия', () => {
  it('метки скрытия', () => {
    expect(adminCarBadges(car({ hidden: true, hiddenByStrikes: true, noShowStrikes: 3 })).map((b) => b.label)).toEqual(['Скрыта по неявкам (3)'])
    expect(adminCarBadges(car({ hidden: true, hiddenByAdmin: true })).map((b) => b.label)).toEqual(['Скрыта администратором'])
    expect(adminCarBadges(car({ hidden: true })).map((b) => b.label)).toEqual(['Скрыта партнёром'])
    expect(adminCarBadges(car({ moderationStatus: 'rejected' }))[0]).toEqual({ label: 'Отклонена', warn: true })
  })
  it('одобрять и отклонять можно только заявку', () => {
    expect(carActions(car({ moderationStatus: 'pending' })).moderate).toBe(true)
    expect(carActions(car()).moderate).toBe(false)
    expect(carActions(car({ moderationStatus: 'rejected' })).moderate).toBe(false)
  })
  it('скрыть: одобренную и ещё не скрытую админом; вернуть: по признаку', () => {
    expect(carActions(car()).hide).toBe(true)
    expect(carActions(car({ hiddenByAdmin: true })).hide).toBe(false)
    expect(carActions(car({ hiddenByAdmin: true })).unhide).toBe(true)
    expect(carActions(car({ hiddenByStrikes: true })).returnToCatalog).toBe(true)
    expect(carActions(car()).returnToCatalog).toBe(false)
    expect(carActions(car({ moderationStatus: 'pending' })).hide).toBe(false)
  })
  it('два вида скрытия сразу', () => {
    expect(hasDoubleHiding({ hiddenByAdmin: true, hiddenByStrikes: true })).toBe(true)
    expect(hasDoubleHiding({ hiddenByAdmin: true, hiddenByStrikes: false })).toBe(false)
  })
})

describe('техосмотр', () => {
  it('просрочен, скоро истекает, в порядке', () => {
    expect(inspectionState('2026-10-20', '2026-10-25')).toEqual({ kind: 'expired', days: 5 })
    expect(inspectionState('2026-10-25', '2026-10-25')).toEqual({ kind: 'soon', days: 0 })
    expect(inspectionState('2026-11-24', '2026-10-25')).toEqual({ kind: 'soon', days: 30 })
    expect(inspectionState('2026-11-25', '2026-10-25')).toEqual({ kind: 'ok', days: 31 })
  })
})
