import { describe, expect, it } from 'vitest'
import { notificationView } from './view'

const v = (type: string, payload: Record<string, unknown> | null, cabinet: 'renter' | 'partner' = 'renter') => notificationView({ type, payload }, cabinet)

const booking = { bookingId: 'b1', carId: 'c1', car: 'Skoda Octavia', plannedStartAt: '2026-10-20T10:00:00Z', plannedEndAt: '2026-10-20T12:00:00Z' }

describe('бронь', () => {
  it('создана: мгновенная и по заявке', () => {
    expect(v('booking_created', { ...booking, awaitingPartnerResponse: false }).title).toBe('Бронь подтверждена')
    const req = v('booking_created', { ...booking, awaitingPartnerResponse: true })
    expect(req.title).toBe('Заявка отправлена партнёру')
    expect(req.body).toContain('6 часов')
    expect(req.to).toBe('/app/bookings/b1')
  })
  it('новая бронь партнёру ведёт в кабинет партнёра', () => {
    const r = v('booking_new', { ...booking, awaitingPartnerResponse: true })
    expect(r.title).toBe('Новая заявка на бронирование')
    expect(r.to).toBe('/partner/bookings/b1')
  })
  it('смена статуса: подтверждена, начата, завершена, отклонена, отменена', () => {
    expect(v('booking_status_changed', { ...booking, status: 'pending', confirmed: true }).title).toBe('Бронь подтверждена')
    expect(v('booking_status_changed', { ...booking, status: 'active' }).title).toBe('Поездка началась')
    expect(v('booking_status_changed', { ...booking, status: 'finished' }).title).toBe('Поездка завершена')
    const declined = v('booking_status_changed', { ...booking, status: 'cancelled', declineReason: 'Машина в ремонте' })
    expect(declined.title).toBe('Партнёр отклонил бронь')
    expect(declined.body).toContain('Причина: Машина в ремонте')
    expect(v('booking_status_changed', { ...booking, status: 'cancelled' }).title).toBe('Бронь отменена')
  })
  it('общие типы ведут в тот кабинет, где открыт список', () => {
    expect(v('booking_status_changed', { ...booking, status: 'active' }, 'renter').to).toBe('/app/bookings/b1')
    expect(v('booking_status_changed', { ...booking, status: 'active' }, 'partner').to).toBe('/partner/bookings/b1')
  })
  it('страйк партнёра', () => {
    const r = v('booking_partner_strike', { ...booking, strikesInWindow: 2, carHidden: true }, 'partner')
    expect(r.body).toContain('Страйков за 30 дней: 2.')
    expect(r.body).toContain('Машина скрыта из каталога.')
  })
  it('без bookingId ссылки нет', () => {
    expect(v('booking_status_changed', { status: 'active' }).to).toBeUndefined()
  })
})

describe('ВУ и машины', () => {
  it('ВУ: одобрено и отклонено с причиной', () => {
    expect(v('license_approved', {}).title).toBe('Водительское удостоверение подтверждено')
    const r = v('license_rejected', { reason: 'Фото нечитаемо' })
    expect(r.body).toBe('Причина: Фото нечитаемо')
    expect(r.to).toBe('/app/license')
  })
  it('машина одобрена и стала партнёром', () => {
    const r = v('car_approved', { carId: 'c1', car: 'Kia Rio', becamePartner: true })
    expect(r.title).toBe('«Kia Rio» одобрена')
    expect(r.body).toContain('кабинет партнёра')
  })
  it('скрытие снято, но остаётся скрытой из-за страйков', () => {
    const r = v('car_unhidden_by_admin', { car: 'Kia Rio', visible: false })
    expect(r.body).toContain('страйков')
  })
})

describe('остальное', () => {
  it('спор', () => {
    const r = v('dispute_resolved', { ...booking, decision: 'partner_favor', damageAmount: '120.50' })
    expect(r.body).toContain('в пользу партнёра')
    expect(r.body).toContain('120,50 BYN')
  })
  it('поддержка', () => {
    expect(v('ticket_message', { ticketId: 't1', subject: 'Не открывается' }).to).toBe('/app/support/t1')
    expect(v('ticket_closed', { ticketId: 't1', subject: 'x' }, 'partner').to).toBe('/partner/support/t1')
    expect(v('ai_escalated', { ticketId: 't1', subject: 'x', priority: 'urgent' }).body).toContain('Срочное')
  })
  it('групповая поездка', () => {
    const r = v('group_trip_joined', { tripId: 'g1', route: 'Минск – Брест', date: '2026-10-25', participantName: 'Иван', participantsCount: 3, maxParticipants: 5 })
    expect(r.title).toBe('Иван присоединился к поездке')
    expect(r.body).toContain('Участников: 3 из 5.')
    expect(r.to).toBe('/app/group-trips/g1')
  })
  it('погода: явления по-русски без повторов', () => {
    const r = v('weather_warning', { ...booking, hazards: [{ hazard: 'rain' }, { hazard: 'rain' }, { hazard: 'strong_wind' }] })
    expect(r.body).toContain('Дождь, Сильный ветер')
  })
  it('неизвестный тип и пустой payload не ломают', () => {
    expect(v('something_new', null).title).toBe('Уведомление')
    expect(v('system', null).title).toBe('Системное уведомление')
  })
})
