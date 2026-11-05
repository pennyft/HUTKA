import type { CarStatus } from '@/shared/config/statusColors'

export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid'
export type Transmission = 'auto' | 'manual'
export type BookingMode = 'instant' | 'request_to_book'

/** CarResponse бэка (car/dto/CarResponse.java). distanceKm заполнен только если в запросе были lat и lng. */
export interface Car {
  id: string
  make: string
  model: string
  year: number
  mileageKm: number
  fuelType: FuelType
  transmission: Transmission
  seats: number
  bodyType: string
  address: string
  latitude: number | null
  longitude: number | null
  pricePerHour: number
  description: string | null
  photos: string[]
  bookingMode: BookingMode
  status: CarStatus
  ratingAvg: number | null
  distanceKm: number | null
}

/** CarMapMarkerResponse: только то, что нужно для ценника на карте. */
export interface CarMapMarker {
  id: string
  latitude: number
  longitude: number
  pricePerHour: number
  status: CarStatus
}
