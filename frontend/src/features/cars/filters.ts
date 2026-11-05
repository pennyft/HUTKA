import type { FuelType, Transmission } from '@/shared/types/car'

export type SortKey = 'rating' | 'price_asc' | 'price_desc'
export type View = 'list' | 'map'

export interface CatalogFilters {
  q: string
  transmission?: Transmission
  fuelType?: FuelType
  seats?: number
  minPrice?: number
  maxPrice?: number
  sort: SortKey
}

const TRANSMISSIONS: Transmission[] = ['auto', 'manual']
const FUELS: FuelType[] = ['petrol', 'diesel', 'electric', 'hybrid']
const SORTS: SortKey[] = ['rating', 'price_asc', 'price_desc']

export const DEFAULT_SORT: SortKey = 'rating'

function pickEnum<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value)
}

function positive(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Фильтры живут в адресной строке (/cars?fuelType=diesel&seats=5): ссылкой можно поделиться, «Назад» работает. */
export function parseFilters(sp: URLSearchParams): CatalogFilters {
  const seats = positive(sp.get('seats'))
  return {
    q: sp.get('q')?.trim() ?? '',
    transmission: pickEnum(sp.get('transmission'), TRANSMISSIONS),
    fuelType: pickEnum(sp.get('fuelType'), FUELS),
    seats: seats !== undefined && Number.isInteger(seats) ? seats : undefined,
    minPrice: positive(sp.get('minPrice')),
    maxPrice: positive(sp.get('maxPrice')),
    sort: pickEnum(sp.get('sort'), SORTS) ?? DEFAULT_SORT,
  }
}

export function parseView(sp: URLSearchParams): View {
  return sp.get('view') === 'map' ? 'map' : 'list'
}

/** Обратное преобразование: значения по умолчанию в адрес не пишем. */
export function toSearchParams(f: CatalogFilters, view: View): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  if (f.transmission) sp.set('transmission', f.transmission)
  if (f.fuelType) sp.set('fuelType', f.fuelType)
  if (f.seats !== undefined) sp.set('seats', String(f.seats))
  if (f.minPrice !== undefined) sp.set('minPrice', String(f.minPrice))
  if (f.maxPrice !== undefined) sp.set('maxPrice', String(f.maxPrice))
  if (f.sort !== DEFAULT_SORT) sp.set('sort', f.sort)
  if (view === 'map') sp.set('view', 'map')
  return sp
}

/** Параметры, общие для GET /cars и GET /cars/map (у карты нет сортировки и страниц). */
export function filtersToQuery(f: CatalogFilters) {
  return {
    q: f.q || undefined,
    transmission: f.transmission,
    fuelType: f.fuelType,
    seats: f.seats,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
  }
}

/** Есть ли что сбрасывать (сортировка не считается фильтром). */
export function hasActiveFilters(f: CatalogFilters): boolean {
  return !!(f.q || f.transmission || f.fuelType || f.seats !== undefined || f.minPrice !== undefined || f.maxPrice !== undefined)
}

/** Если «от» больше «до», меняем местами, чтобы не отправлять заведомо пустой диапазон. */
export function normalizePriceRange(min?: number, max?: number): { minPrice?: number; maxPrice?: number } {
  if (min !== undefined && max !== undefined && min > max) return { minPrice: max, maxPrice: min }
  return { minPrice: min, maxPrice: max }
}
