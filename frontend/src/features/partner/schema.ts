import { z } from 'zod'
import { BODY_TYPES, FUEL_ORDER, TRANSMISSION_ORDER } from './labels'

/** Пределы бэка (CreateCarRequest, CarService): год с 2014, пробег до 200 000 км, место до 20, цена до 8 цифр и 2 знаков. */
export const MIN_YEAR = 2014
export const MAX_MILEAGE_KM = 200_000
export const MAX_SEATS = 20
export const MAX_PRICE = 99_999_999.99
export const PHOTOS_MIN = 5
export const PHOTOS_MAX = 15

/** Сегодня по часам устройства: YYYY-MM-DD. Техосмотр не должен быть в прошлом (бэк сверяет по своей дате, поэтому у границы возможен отказ сервера). */
export const todayLocal = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** «12,5» и «12.5» одинаково. Пусто и мусор дают NaN. */
export const parsePrice = (s: string): number => (/^\d+([.,]\d{1,2})?$/.test(s.trim()) ? Number(s.trim().replace(',', '.')) : NaN)

const text = (max: number, empty: string, long = `Не больше ${max} символов`) => z.string().trim().min(1, empty).max(max, long)
const int = (name: string, min: number, max: number, msg: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, msg)

export const carSchema = z.object({
  make: text(64, 'Укажите марку'),
  model: text(64, 'Укажите модель'),
  year: z
    .string()
    .trim()
    .refine((v) => /^\d{4}$/.test(v), 'Введите год из четырёх цифр')
    .refine((v) => Number(v) >= MIN_YEAR, `Год выпуска не ранее ${MIN_YEAR}`)
    .refine((v) => Number(v) <= new Date().getFullYear() + 1, 'Некорректный год выпуска'),
  plateNumber: text(16, 'Укажите госномер'),
  mileageKm: int('mileage', 0, MAX_MILEAGE_KM, `Пробег от 0 до ${MAX_MILEAGE_KM.toLocaleString('ru-RU')} км`),
  fuelType: z.string().refine((v) => (FUEL_ORDER as string[]).includes(v), 'Выберите тип топлива'),
  transmission: z.string().refine((v) => (TRANSMISSION_ORDER as string[]).includes(v), 'Выберите коробку передач'),
  seats: int('seats', 1, MAX_SEATS, `Мест от 1 до ${MAX_SEATS}`),
  bodyType: z.string().refine((v) => BODY_TYPES.includes(v), 'Выберите тип кузова'),
  address: text(255, 'Укажите адрес, где забирают машину'),
  pricePerHour: z.string().refine((v) => {
    const n = parsePrice(v)
    return Number.isFinite(n) && n > 0 && n <= MAX_PRICE
  }, 'Цена за час: число больше нуля, до двух знаков после запятой'),
  description: z.string().trim().max(2000, 'Не больше 2000 символов'),
  techPassportNumber: text(64, 'Укажите номер техпаспорта'),
  insurancePolicyNumber: text(64, 'Укажите номер полиса'),
  inspectionExpiryDate: z
    .string()
    .min(1, 'Укажите дату окончания техосмотра')
    .refine((v) => v >= todayLocal(), 'Техосмотр не должен быть просрочен'),
  bookingMode: z.string().refine((v): boolean => v === 'instant' || v === 'request_to_book', 'Выберите режим бронирования'),
})
export type CarFormValues = z.infer<typeof carSchema>

export const carDefaults: CarFormValues = {
  make: '',
  model: '',
  year: '',
  plateNumber: '',
  mileageKm: '',
  fuelType: '',
  transmission: '',
  seats: '5',
  bodyType: '',
  address: '',
  pricePerHour: '',
  description: '',
  techPassportNumber: '',
  insurancePolicyNumber: '',
  inspectionExpiryDate: '',
  bookingMode: 'instant',
}
