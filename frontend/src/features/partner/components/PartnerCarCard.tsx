import { useState } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { carBadges, visibilityState } from '../carsLogic'
import { useCarActions } from '../hooks'
import type { PartnerCar } from '../types'

/**
 * Карточка машины партнёра (P2): фото, статусы, рейтинг, доход за месяц и действия. «Показать» для машины, скрытой администратором
 * или по неявкам, заблокировано (бэк ответит 403, вернуть её может только администратор). Удалить нельзя, если есть завершённые поездки
 * (тогда остаётся скрыть) или активные брони: бэк ответит 409, текст покажется уведомлением.
 */
export function PartnerCarCard({ car }: { car: PartnerCar }) {
  const { toggle, remove } = useCarActions()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const badges = carBadges(car)
  const vis = visibilityState(car)

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-surface">
      <CarPhoto src={car.photos[0]} className="aspect-[16/9] w-full" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-fg">
              {car.make} {car.model}, {car.year}
            </p>
            <p className="text-xs text-muted">{car.plateNumber}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-fg">{formatMoney(car.pricePerHour)}/ч</p>
        </div>

        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${b.tone === 'warn' ? 'border-danger/50 text-danger' : 'border-line text-fg'}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}
        {car.moderationStatus === 'rejected' && car.rejectionReason && <p className="mt-2 text-sm text-danger">Причина отказа: {car.rejectionReason}</p>}

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Star className="size-4" aria-hidden />
            {car.ratingAvg !== null ? car.ratingAvg.toFixed(1).replace('.', ',') : 'нет оценок'}
          </span>
          <span>Доход за месяц: {car.monthIncome !== null ? formatMoney(car.monthIncome) : '—'}</span>
        </p>

        {confirmDelete ? (
          <div className="mt-4">
            <p className="text-sm text-fg">Удалить машину? Это нельзя отменить.</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Button variant="dark" loading={remove.isPending} onClick={() => remove.mutate(car.id, { onSettled: () => setConfirmDelete(false) })}>
                Удалить
              </Button>
              <Button variant="outline" disabled={remove.isPending} onClick={() => setConfirmDelete(false)}>
                Назад
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/partner/cars/${car.id}/edit`} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2">
              Редактировать
            </Link>
            {vis.kind === 'toggle' && (
              <Button variant="outline" loading={toggle.isPending} onClick={() => toggle.mutate({ id: car.id, hidden: vis.hide })} className="sm:w-auto">
                {vis.hide ? 'Скрыть' : 'Показать'}
              </Button>
            )}
            {vis.kind === 'locked' && (
              <Button variant="outline" disabled className="sm:w-auto">
                Показать
              </Button>
            )}
            <Button variant="outline" onClick={() => setConfirmDelete(true)} className="sm:w-auto">
              Удалить
            </Button>
          </div>
        )}
        {vis.kind === 'locked' && <p className="mt-2 text-xs text-muted">{vis.reason}</p>}
      </div>
    </li>
  )
}
