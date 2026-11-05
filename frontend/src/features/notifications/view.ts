import { HAZARD_LABEL, formatMoney } from '@/features/bookings/format'
import { formatPeriod } from '@/features/bookings/period'
import type { WeatherHazard } from '@/features/bookings/types'
import type { AppNotification, Cabinet } from './types'

export interface NotificationView {
  title: string
  body?: string
  /** Куда ведёт уведомление; без него строка только отмечается прочитанной */
  to?: string
}

type Payload = Record<string, unknown>

const str = (p: Payload, k: string): string | undefined => (typeof p[k] === 'string' && p[k] ? (p[k] as string) : undefined)
const num = (p: Payload, k: string): number | undefined => (typeof p[k] === 'number' ? (p[k] as number) : undefined)
const bool = (p: Payload, k: string): boolean | undefined => (typeof p[k] === 'boolean' ? (p[k] as boolean) : undefined)
const lines = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join('\n') || undefined

/** «Skoda Octavia, 20 окт, 10:00–12:00»: машина и период из payload брони. */
function carAndPeriod(p: Payload): string | undefined {
  const car = str(p, 'car')
  const start = str(p, 'plannedStartAt')
  const end = str(p, 'plannedEndAt')
  const period = start && end ? formatPeriod(start, end) : undefined
  return [car, period].filter(Boolean).join(', ') || undefined
}

/**
 * Текст и ссылка уведомления по его типу и payload. Типы и поля взяты из кода бэка: NotificationBookingNotifier,
 * NotificationWeatherNotifier, AdminCarService, AdminDisputeService, AdminTicketService, AdminUserService,
 * GroupTripService, AiChatService. Неизвестный тип показывается нейтрально, а не пропадает.
 * Общие для двух ролей типы (статус брони, спор, поддержка) ведут в тот кабинет, где открыт список.
 */
export function notificationView(n: Pick<AppNotification, 'type' | 'payload'>, cabinet: Cabinet): NotificationView {
  const p: Payload = n.payload ?? {}
  const base = cabinet === 'partner' ? '/partner' : '/app'
  const bookingId = str(p, 'bookingId')
  const sharedBooking = bookingId ? `${base}/bookings/${bookingId}` : undefined
  const renterBooking = bookingId ? `/app/bookings/${bookingId}` : undefined
  const partnerBooking = bookingId ? `/partner/bookings/${bookingId}` : undefined
  const ticketId = str(p, 'ticketId')
  const ticketTo = ticketId ? `${base}/support/${ticketId}` : `${base}/support`
  const car = str(p, 'car')
  const carQuoted = car ? `«${car}»` : 'Машина'
  const tripTo = str(p, 'tripId') ? `/app/group-trips/${str(p, 'tripId')}` : '/app/group-trips'

  switch (n.type) {
    case 'booking_created':
      return {
        title: bool(p, 'awaitingPartnerResponse') ? 'Заявка отправлена партнёру' : 'Бронь подтверждена',
        body: lines(carAndPeriod(p), bool(p, 'awaitingPartnerResponse') && 'Партнёр ответит в течение 6 часов.'),
        to: renterBooking,
      }
    case 'booking_new':
      return {
        title: bool(p, 'awaitingPartnerResponse') ? 'Новая заявка на бронирование' : 'Новое бронирование',
        body: lines(carAndPeriod(p), bool(p, 'awaitingPartnerResponse') && 'Ответьте на заявку в течение 6 часов.'),
        to: partnerBooking,
      }
    case 'booking_status_changed': {
      const status = str(p, 'status')
      const reason = str(p, 'declineReason')
      let title = 'Статус брони изменён'
      if (status === 'cancelled') title = reason ? 'Партнёр отклонил бронь' : 'Бронь отменена'
      else if (status === 'pending' && bool(p, 'confirmed')) title = 'Бронь подтверждена'
      else if (status === 'active') title = 'Поездка началась'
      else if (status === 'finished') title = 'Поездка завершена'
      return { title, body: lines(carAndPeriod(p), reason && `Причина: ${reason}`), to: sharedBooking }
    }
    case 'booking_request_expired':
      return { title: 'Заявка отклонена: время ответа истекло', body: carAndPeriod(p), to: sharedBooking }
    case 'booking_renter_no_show':
      return { title: 'Бронь отменена: поездка не была начата вовремя', body: carAndPeriod(p), to: sharedBooking }
    case 'booking_partner_no_show':
      return {
        title: 'Бронь отменена: машина оказалась недоступна',
        body: lines(carAndPeriod(p), 'Для вас это без последствий.'),
        to: renterBooking,
      }
    case 'booking_partner_strike': {
      const strikes = num(p, 'strikesInWindow')
      return {
        title: 'Страйк за недоступность машины',
        body: lines(carAndPeriod(p), strikes !== undefined && `Страйков за 30 дней: ${strikes}.`, bool(p, 'carHidden') && 'Машина скрыта из каталога.'),
        to: partnerBooking,
      }
    }
    case 'booking_overdue_escalated':
      return { title: 'Просрочка возврата больше 3 часов: бронь передана администратору', body: carAndPeriod(p), to: sharedBooking }
    case 'license_approved':
      return { title: 'Водительское удостоверение подтверждено', body: 'Теперь доступны бронирование, тест ПДД и групповые поездки.', to: '/cars' }
    case 'license_rejected':
      return { title: 'Водительское удостоверение отклонено', body: str(p, 'reason') && `Причина: ${str(p, 'reason')}`, to: '/app/license' }
    case 'car_approved':
      return {
        title: `${carQuoted} одобрена`,
        body: bool(p, 'becamePartner') ? 'Теперь вам доступен кабинет партнёра.' : undefined,
        to: '/partner/cars',
      }
    case 'car_rejected':
      return { title: `${carQuoted} отклонена`, body: str(p, 'reason') && `Причина: ${str(p, 'reason')}`, to: '/partner/cars' }
    case 'car_returned_to_catalog':
      return { title: `${carQuoted} возвращена в каталог`, to: '/partner/cars' }
    case 'car_hidden_by_admin':
      return { title: `${carQuoted} скрыта администратором`, body: str(p, 'reason') && `Причина: ${str(p, 'reason')}`, to: '/partner/cars' }
    case 'car_unhidden_by_admin':
      return {
        title: bool(p, 'visible') === false ? `Администратор снял скрытие с ${carQuoted}` : `${carQuoted} снова в каталоге`,
        body: bool(p, 'visible') === false ? 'Машина всё ещё скрыта из-за страйков за неявку.' : undefined,
        to: '/partner/cars',
      }
    case 'car_deleted_by_admin':
      return { title: `${carQuoted} удалена администратором`, to: '/partner/cars' }
    case 'dispute_resolved': {
      const decision = str(p, 'decision')
      const damage = Number(str(p, 'damageAmount'))
      return {
        title: 'Спор решён',
        body: lines(
          decision === 'renter_favor' ? 'Решение в пользу арендатора.' : decision === 'partner_favor' ? 'Решение в пользу партнёра.' : undefined,
          Number.isFinite(damage) && damage > 0 && `Признанный ущерб: ${formatMoney(damage)} BYN.`,
          car,
        ),
        to: sharedBooking,
      }
    }
    case 'ticket_message':
      return { title: 'Новый ответ поддержки', body: str(p, 'subject'), to: ticketTo }
    case 'ticket_closed':
      return { title: 'Обращение закрыто', body: str(p, 'subject'), to: ticketTo }
    case 'ai_escalated':
      return {
        title: 'Обращение передано оператору',
        body: lines(str(p, 'subject'), str(p, 'priority') === 'urgent' && 'Срочное.'),
        to: ticketTo,
      }
    case 'group_trip_joined': {
      const count = num(p, 'participantsCount')
      const max = num(p, 'maxParticipants')
      return {
        title: `${str(p, 'participantName') ?? 'Участник'} присоединился к поездке`,
        body: lines([str(p, 'route'), str(p, 'date')].filter(Boolean).join(', '), count !== undefined && max !== undefined && `Участников: ${count} из ${max}.`),
        to: tripTo,
      }
    }
    case 'group_trip_closed':
      return { title: 'Набор в групповую поездку закрыт', body: [str(p, 'route'), str(p, 'date')].filter(Boolean).join(', ') || undefined, to: tripTo }
    case 'group_trip_cancelled':
      return { title: 'Групповая поездка отменена', body: [str(p, 'route'), str(p, 'date')].filter(Boolean).join(', ') || undefined, to: tripTo }
    case 'weather_warning': {
      const hazards = Array.isArray(p.hazards) ? (p.hazards as { hazard?: string }[]) : []
      const names = [...new Set(hazards.map((h) => (h.hazard ? (HAZARD_LABEL[h.hazard as WeatherHazard] ?? h.hazard) : '')).filter(Boolean))]
      return {
        title: 'Возможна непогода во время поездки',
        body: lines(carAndPeriod(p), names.length > 0 && names.join(', ')),
        to: renterBooking,
      }
    }
    case 'system':
      return { title: 'Системное уведомление', body: str(p, 'message') ?? str(p, 'text') }
    default:
      return { title: 'Уведомление' }
  }
}
