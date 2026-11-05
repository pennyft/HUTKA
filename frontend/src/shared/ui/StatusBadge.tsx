import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  CAR_STATUS_COLOR,
  CAR_STATUS_LABEL,
  type BookingStatus,
  type CarStatus,
} from '@/shared/config/statusColors'

type Props = { kind: 'car'; status: CarStatus } | { kind: 'booking'; status: BookingStatus }

/**
 * Статус = цветная точка + графитовый текст. Сам цвет статуса как цвет текста на белом не проходит WCAG AA
 * (зелёный 2.28:1, оранжевый 2.80:1, синий 3.68:1), поэтому текст всегда графитовый.
 * Бронь «Ждёт партнёра» (pending без confirmedAt) от «Подтверждена» этот компонент не отличает: подпись для этого случая задайте отдельно.
 */
export function StatusBadge(props: Props) {
  const color = props.kind === 'car' ? CAR_STATUS_COLOR[props.status] : BOOKING_STATUS_COLOR[props.status]
  const label = props.kind === 'car' ? CAR_STATUS_LABEL[props.status] : BOOKING_STATUS_LABEL[props.status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-sm text-fg">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
