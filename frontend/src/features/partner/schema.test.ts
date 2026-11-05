import { describe, expect, it } from 'vitest'
import { carDefaults, carSchema, parsePrice, todayLocal } from './schema'

const ok = { ...carDefaults, make: 'Skoda', model: 'Octavia', year: '2020', plateNumber: '1234 AB-7', mileageKm: '80000', fuelType: 'petrol', transmission: 'auto', seats: '5', bodyType: 'Седан', address: 'Минск, пр. Независимости, 1', pricePerHour: '12,5', techPassportNumber: 'AA123', insurancePolicyNumber: 'BB456', inspectionExpiryDate: '2999-01-01' }
const msg = (v: unknown, field: string) => {
  const r = carSchema.safeParse(v)
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === field)?.message
}

describe('форма машины', () => {
  it('верные данные проходят', () => {
    expect(carSchema.safeParse(ok).success).toBe(true)
  })
  it('год: не раньше 2014 и не позже следующего', () => {
    expect(msg({ ...ok, year: '2013' }, 'year')).toBe('Год выпуска не ранее 2014')
    expect(msg({ ...ok, year: '20x' }, 'year')).toBe('Введите год из четырёх цифр')
    expect(carSchema.safeParse({ ...ok, year: '2014' }).success).toBe(true)
    expect(msg({ ...ok, year: String(new Date().getFullYear() + 2) }, 'year')).toBe('Некорректный год выпуска')
  })
  it('пробег до 200 000', () => {
    expect(carSchema.safeParse({ ...ok, mileageKm: '200000' }).success).toBe(true)
    expect(msg({ ...ok, mileageKm: '200001' }, 'mileageKm')).toMatch(/200/)
    expect(msg({ ...ok, mileageKm: '-5' }, 'mileageKm')).toBeDefined()
  })
  it('места от 1 до 20', () => {
    expect(msg({ ...ok, seats: '0' }, 'seats')).toBeDefined()
    expect(msg({ ...ok, seats: '21' }, 'seats')).toBeDefined()
    expect(carSchema.safeParse({ ...ok, seats: '20' }).success).toBe(true)
  })
  it('цена: запятая и точка, до двух знаков, больше нуля', () => {
    expect(parsePrice('12,5')).toBe(12.5)
    expect(parsePrice('12.50')).toBe(12.5)
    expect(parsePrice('0')).toBe(0)
    expect(parsePrice('12,555')).toBeNaN()
    expect(parsePrice('abc')).toBeNaN()
    expect(msg({ ...ok, pricePerHour: '0' }, 'pricePerHour')).toBeDefined()
    expect(msg({ ...ok, pricePerHour: '100000000' }, 'pricePerHour')).toBeDefined()
  })
  it('выпадающие списки не принимают произвольное', () => {
    expect(msg({ ...ok, fuelType: 'gas' }, 'fuelType')).toBe('Выберите тип топлива')
    expect(msg({ ...ok, transmission: '' }, 'transmission')).toBe('Выберите коробку передач')
    expect(msg({ ...ok, bodyType: 'Лимузин' }, 'bodyType')).toBe('Выберите тип кузова')
  })
  it('техосмотр не в прошлом', () => {
    expect(msg({ ...ok, inspectionExpiryDate: '2000-01-01' }, 'inspectionExpiryDate')).toBe('Техосмотр не должен быть просрочен')
    expect(carSchema.safeParse({ ...ok, inspectionExpiryDate: todayLocal() }).success).toBe(true)
    expect(msg({ ...ok, inspectionExpiryDate: '' }, 'inspectionExpiryDate')).toBe('Укажите дату окончания техосмотра')
  })
  it('обязательные тексты и пределы длины', () => {
    expect(msg({ ...ok, make: '  ' }, 'make')).toBe('Укажите марку')
    expect(msg({ ...ok, plateNumber: 'a'.repeat(17) }, 'plateNumber')).toBe('Не больше 16 символов')
    expect(msg({ ...ok, description: 'a'.repeat(2001) }, 'description')).toBe('Не больше 2000 символов')
    expect(carSchema.safeParse({ ...ok, description: '' }).success).toBe(true)
  })
})
