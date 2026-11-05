import type { BookingMode, FuelType, ModerationStatus, Transmission } from './types'

export const FUEL_LABEL: Record<FuelType, string> = { petrol: 'Бензин', diesel: 'Дизель', electric: 'Электро', hybrid: 'Гибрид' }
export const FUEL_ORDER: FuelType[] = ['petrol', 'diesel', 'hybrid', 'electric']

export const TRANSMISSION_LABEL: Record<Transmission, string> = { auto: 'Автомат', manual: 'Механика' }
export const TRANSMISSION_ORDER: Transmission[] = ['auto', 'manual']

/**
 * Типы кузова. Бэк хранит свободную строку (до 64 символов) и ищет в каталоге по точному совпадению без учёта регистра,
 * поэтому в форме варианты фиксированы: так значения у разных машин совпадают.
 */
export const BODY_TYPES = ['Седан', 'Хэтчбек', 'Универсал', 'Кроссовер', 'Внедорожник', 'Минивэн', 'Купе', 'Кабриолет', 'Пикап']

export const BOOKING_MODE_LABEL: Record<BookingMode, { title: string; text: string }> = {
  instant: { title: 'Мгновенное бронирование', text: 'Бронь подтверждается сразу, без вашего ответа.' },
  request_to_book: { title: 'По запросу', text: 'Вы подтверждаете каждую заявку: на ответ даётся 6 часов.' },
}

export const MODERATION_LABEL: Record<ModerationStatus, string> = { pending: 'На модерации', approved: 'Одобрена', rejected: 'Отклонена' }
