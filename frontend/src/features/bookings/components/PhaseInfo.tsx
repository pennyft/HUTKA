import { formatDuration } from '../time'
import { formatMoment } from '../period'
import { ESCALATION_MS, bookingPhase, noShowDeadline, overdueMs, partnerDeadline } from '../status'
import type { Booking } from '../types'

const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60_000))

/**
 * Что сейчас происходит с бронью и что дальше: текст зависит от этапа. Сроки (6 часов на ответ, час на старт,
 * 3 часа до спора) взяты из BookingRules бэка. now передаётся снаружи (useNow), чтобы отсчёт шёл сам.
 */
export function PhaseInfo({ booking, now }: { booking: Booking; now: Date }) {
  const phase = bookingPhase(booking)
  let title = ''
  const lines: { text: string; warn?: boolean }[] = []

  switch (phase) {
    case 'awaiting_partner': {
      title = 'Ждём ответа партнёра'
      const left = partnerDeadline(booking).getTime() - now.getTime()
      lines.push(
        left > 0
          ? { text: `Партнёр отвечает на заявку в течение 6 часов. Осталось ${formatDuration(minutes(left))} (до ${formatMoment(partnerDeadline(booking).toISOString())}).` }
          : { text: 'Время ответа истекло. Если партнёр не ответил, заявка будет отклонена автоматически.', warn: true },
      )
      break
    }
    case 'confirmed': {
      title = 'Бронь подтверждена'
      const start = new Date(booking.plannedStartAt).getTime()
      const deadline = noShowDeadline(booking)
      if (now.getTime() < start) {
        lines.push({ text: `Начать поездку можно с ${formatMoment(booking.plannedStartAt)}.` })
      } else if (now <= deadline) {
        lines.push({ text: `Можно начинать поездку. Если не начать до ${formatMoment(deadline.toISOString())}, бронь отменится автоматически.` })
      } else {
        lines.push({ text: 'Время начала поездки вышло, бронь будет отменена автоматически.', warn: true })
      }
      break
    }
    case 'active': {
      title = 'Идёт поездка'
      const over = overdueMs(booking, now)
      if (over > 0) {
        lines.push({
          text: `Возврат просрочен на ${formatDuration(minutes(over))}. Просроченные часы оплачиваются по тарифу ×1,5.`,
          warn: true,
        })
        const left = ESCALATION_MS - over
        lines.push({
          text:
            left > 0
              ? `Если просрочка превысит 3 часа, бронь будет передана администратору как спор (осталось ${formatDuration(minutes(left))}).`
              : 'Просрочка превысила 3 часа: бронь передаётся администратору как спор.',
          warn: left <= 0,
        })
      } else {
        lines.push({ text: `Верните машину до ${formatMoment(booking.plannedEndAt)}.` })
      }
      break
    }
    case 'finished':
      title = 'Поездка завершена'
      if (booking.actualEndAt) lines.push({ text: `Завершена ${formatMoment(booking.actualEndAt)}.` })
      break
    case 'cancelled':
      title = 'Бронь отменена'
      if (booking.declineReason) lines.push({ text: `Причина отказа партнёра: ${booking.declineReason}` })
      break
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {lines.map((l, i) => (
        <p key={i} className={`mt-1 text-sm ${l.warn ? 'font-medium text-danger' : 'text-muted'}`}>
          {l.text}
        </p>
      ))}
    </div>
  )
}
