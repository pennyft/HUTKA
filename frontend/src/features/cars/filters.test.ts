import { describe, expect, it } from 'vitest'
import { filtersToQuery, hasActiveFilters, normalizePriceRange, parseFilters, parseView, toSearchParams } from './filters'

const parse = (qs: string) => parseFilters(new URLSearchParams(qs))

describe('parseFilters', () => {
  it('значения по умолчанию', () => {
    expect(parse('')).toEqual({
      q: '',
      transmission: undefined,
      fuelType: undefined,
      seats: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'rating',
    })
  })
  it('читает корректные значения', () => {
    const f = parse('q=%20kia%20&transmission=auto&fuelType=diesel&seats=5&minPrice=3,5&maxPrice=10&sort=price_desc')
    expect(f).toMatchObject({ q: 'kia', transmission: 'auto', fuelType: 'diesel', seats: 5, minPrice: 3.5, maxPrice: 10, sort: 'price_desc' })
  })
  it('отбрасывает мусор', () => {
    const f = parse('transmission=cvt&fuelType=gas&seats=abc&minPrice=-1&maxPrice=0&sort=distance')
    expect(f.transmission).toBeUndefined()
    expect(f.fuelType).toBeUndefined()
    expect(f.seats).toBeUndefined()
    expect(f.minPrice).toBeUndefined()
    expect(f.maxPrice).toBeUndefined()
    // distance в адрес не пишется: без координат бэк ответил бы 400
    expect(f.sort).toBe('rating')
  })
  it('нецелое число мест не принимается', () => {
    expect(parse('seats=4.5').seats).toBeUndefined()
  })
})

describe('toSearchParams', () => {
  it('не пишет значения по умолчанию и повторяет разбор', () => {
    const f = parse('fuelType=hybrid&seats=4&sort=price_asc')
    const sp = toSearchParams(f, 'map')
    expect(sp.toString()).toBe('fuelType=hybrid&seats=4&sort=price_asc&view=map')
    expect(parseFilters(sp)).toEqual(f)
    expect(parseView(sp)).toBe('map')
  })
  it('пустые фильтры дают пустой адрес', () => {
    expect(toSearchParams(parse(''), 'list').toString()).toBe('')
  })
})

describe('filtersToQuery и hasActiveFilters', () => {
  it('в запрос идут только заданные поля', () => {
    expect(filtersToQuery(parse('q=a&seats=5'))).toMatchObject({ q: 'a', seats: 5, fuelType: undefined })
  })
  it('сортировка не считается фильтром', () => {
    expect(hasActiveFilters(parse('sort=price_asc'))).toBe(false)
    expect(hasActiveFilters(parse('seats=5'))).toBe(true)
  })
})

describe('normalizePriceRange', () => {
  it('меняет местами перепутанные границы', () => {
    expect(normalizePriceRange(10, 5)).toEqual({ minPrice: 5, maxPrice: 10 })
    expect(normalizePriceRange(5, 10)).toEqual({ minPrice: 5, maxPrice: 10 })
    expect(normalizePriceRange(undefined, 10)).toEqual({ minPrice: undefined, maxPrice: 10 })
  })
})
