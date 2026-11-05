import { useNavigate } from 'react-router'
import { useMe } from '@/features/auth/hooks'
import { useAuthStore } from '@/features/auth/store'
import { CAR_STATUS_LABEL } from '@/shared/config/statusColors'
import type { Car } from '@/shared/types/car'

export interface BookCta {
  label: string
  disabled: boolean
  onClick: () => void
  /** Пояснение под кнопкой (нужно подтвердить ВУ, машина занята) */
  note: string | null
}

/**
 * Действие кнопки «Забронировать» (общее для карточки справа и нижней полосы на телефоне):
 * гость идёт на вход и возвращается на форму брони, неподтверждённого пользователя форма брони
 * сама отправит на верификацию ВУ (RequireVerified), поэтому предупреждаем заранее.
 */
export function useBookCta(car: Car): BookCta {
  const token = useAuthStore((s) => s.token)
  const { data: me } = useMe()
  const navigate = useNavigate()
  const target = `/app/bookings/new?carId=${car.id}`

  if (car.status === 'under_review') {
    return { label: 'Недоступна', disabled: true, onClick: () => {}, note: 'Машина сейчас на проверке.' }
  }
  if (!token) {
    return { label: 'Войти, чтобы забронировать', disabled: false, onClick: () => navigate('/login', { state: { from: target } }), note: null }
  }
  const notes: string[] = []
  if (me && me.verificationStatus !== 'verified') notes.push('Для бронирования подтвердите водительское удостоверение.')
  if (car.status !== 'available') notes.push(`Сейчас статус машины: ${CAR_STATUS_LABEL[car.status].toLowerCase()}. Бронь возможна на свободное время.`)
  return { label: 'Забронировать', disabled: false, onClick: () => navigate(target), note: notes.length ? notes.join(' ') : null }
}

/** Что произойдёт после брони: зависит от режима (instant или заявка партнёру на 6 часов). */
export function bookingModeNote(car: Car): { badge: string; text: string } {
  return car.bookingMode === 'instant'
    ? { badge: 'Подтверждает сразу', text: 'Бронь подтверждается сразу после оформления.' }
    : { badge: 'По заявке', text: 'Партнёр отвечает на заявку в течение 6 часов, иначе она отклоняется автоматически.' }
}
