import { describe, expect, it } from 'vitest'
import { buildCarBody, photosProblem } from './build'
import { carDefaults } from './schema'

const v = { ...carDefaults, make: ' Skoda ', model: 'Octavia', year: '2020', plateNumber: '1234 AB-7', mileageKm: '80000', fuelType: 'diesel', transmission: 'manual', seats: '5', bodyType: 'Седан', address: ' Минск, пр. Независимости, 1 ', pricePerHour: '12,5', techPassportNumber: 'AA123', insurancePolicyNumber: 'BB456', inspectionExpiryDate: '2999-01-01', bookingMode: 'request_to_book' }
const photos = ['https://p.supabase.co/a.jpg']

describe('тело запроса', () => {
  it('строки превращаются в числа, тексты обрезаются', () => {
    const b = buildCarBody(v, photos, null)
    expect(b).toMatchObject({ make: 'Skoda', year: 2020, mileageKm: 80000, seats: 5, pricePerHour: 12.5, address: 'Минск, пр. Независимости, 1', fuelType: 'diesel', transmission: 'manual', bookingMode: 'request_to_book', photos })
  })
  it('пустое описание и выключенное расписание не отправляются', () => {
    const b = buildCarBody(v, photos, null)
    expect('description' in b).toBe(false)
    expect('availabilitySchedule' in b).toBe(false)
  })
  it('описание и расписание передаются, когда есть', () => {
    const b = buildCarBody({ ...v, description: ' Чистая машина ' }, photos, '{"mon":[]}')
    expect(b.description).toBe('Чистая машина')
    expect(b.availabilitySchedule).toBe('{"mon":[]}')
  })
})

describe('проверка фото', () => {
  it('пока грузятся, отправлять нельзя', () => {
    expect(photosProblem(5, true)).toBe('Дождитесь окончания загрузки фото.')
  })
  it('минимум пять', () => {
    expect(photosProblem(4, false)).toBe('Нужно минимум 5 фото, загружено 4.')
    expect(photosProblem(5, false)).toBeNull()
    expect(photosProblem(15, false)).toBeNull()
  })
})
