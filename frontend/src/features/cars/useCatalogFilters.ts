import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { CatalogFilters, CatalogSort, FuelType, Transmission } from './types'

const FUELS: readonly FuelType[] = ['petrol', 'diesel', 'electric', 'hybrid']
const TRANSMISSIONS: readonly Transmission[] = ['auto', 'manual']
const SORTS: readonly CatalogSort[] = ['rating', 'price_asc', 'price_desc', 'distance']

function pick<T extends string>(v: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === v)
}

function toNumber(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Фильтры каталога живут в адресной строке: ссылкой можно поделиться, кнопка «Назад» работает. */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<CatalogFilters>(
    () => ({
      q: params.get('q') ?? '',
      fuelType: pick(params.get('fuelType'), FUELS),
      transmission: pick(params.get('transmission'), TRANSMISSIONS),
      seats: toNumber(params.get('seats')),
      minPrice: toNumber(params.get('minPrice')),
      maxPrice: toNumber(params.get('maxPrice')),
      sort: pick(params.get('sort'), SORTS) ?? 'rating',
    }),
    [params],
  )

  /** Меняет только переданные поля. undefined или пустая строка убирают параметр. */
  const update = useCallback(
    (patch: Partial<CatalogFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || (key === 'sort' && value === 'rating')) next.delete(key)
            else next.set(key, String(value))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const activeCount = [
    filters.q.trim() !== '',
    filters.fuelType,
    filters.transmission,
    filters.seats,
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
  ].filter(Boolean).length

  return { filters, update, reset, activeCount }
}
