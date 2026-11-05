import type { CarStatus } from '@/shared/config/statusColors'

/** Значения enum'ов бэка (CarController.java, раздел 4.1). */
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid'
export type Transmission = 'auto' | 'manual'
export type BookingMode = 'instant' | 'request_to_book'
export type CatalogSort = 'rating' | 'price_asc' | 'price_desc' | 'distance'

/** Ответ GET /cars и GET /cars/{id} (car/dto/CarResponse.java). distanceKm заполнен, только если переданы lat и lng. */
export interface Car {
  id: string
  make: string
  model: string
  year: number
  mileageKm: number
  fuelType: FuelType
  transmission: Transmission
  seats: number
  bodyType: string | null
  address: string
  latitude: number
  longitude: number
  /** BigDecimal на бэке: может прийти числом или строкой, поэтому всегда оборачивайте в Number(). */
  pricePerHour: number | string
  description: string | null
  photos: string[]
  bookingMode: BookingMode
  status: CarStatus
  ratingAvg: number | null
  distanceKm: number | null
}

/** Ответ GET /cars/map: только маркеры. */
export interface CarMarker {
  id: string
  latitude: number
  longitude: number
  pricePerHour: number | string
  status: CarStatus
}

export interface CatalogFilters {
  q: string
  fuelType?: FuelType
  transmission?: Transmission
  /** Бэк фильтрует по ТОЧНОМУ числу мест (cb.equal), а не «от N». */
  seats?: number
  minPrice?: number
  maxPrice?: number
  sort: CatalogSort
}

export interface Coords {
  lat: number
  lng: number
}
