import type { CarFormValues } from './schema'
import { parsePrice, PHOTOS_MIN } from './schema'
import type { BookingMode, CreateCarBody, FuelType, Transmission } from './types'

/** Значения формы в тело POST /partner/cars: числа из строк, пустое описание не отправляем, расписание только если оно включено. */
export function buildCarBody(v: CarFormValues, photos: string[], schedule: string | null): CreateCarBody {
  const description = v.description.trim()
  return {
    make: v.make.trim(),
    model: v.model.trim(),
    year: Number(v.year),
    plateNumber: v.plateNumber.trim(),
    mileageKm: Number(v.mileageKm),
    fuelType: v.fuelType as FuelType,
    transmission: v.transmission as Transmission,
    seats: Number(v.seats),
    bodyType: v.bodyType,
    address: v.address.trim(),
    pricePerHour: parsePrice(v.pricePerHour),
    ...(description ? { description } : {}),
    photos,
    techPassportNumber: v.techPassportNumber.trim(),
    insurancePolicyNumber: v.insurancePolicyNumber.trim(),
    inspectionExpiryDate: v.inspectionExpiryDate,
    ...(schedule ? { availabilitySchedule: schedule } : {}),
    bookingMode: v.bookingMode as BookingMode,
  }
}

/** Проблема с фото перед отправкой: ещё грузятся или меньше пяти (бэк: «Минимум 5 фотографий»). */
export function photosProblem(uploaded: number, busy: boolean): string | null {
  if (busy) return 'Дождитесь окончания загрузки фото.'
  if (uploaded < PHOTOS_MIN) return `Нужно минимум ${PHOTOS_MIN} фото, загружено ${uploaded}.`
  return null
}
