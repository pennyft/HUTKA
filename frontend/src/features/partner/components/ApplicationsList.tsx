import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { MODERATION_LABEL } from '../labels'
import type { PartnerCar } from '../types'

/** Заявки пользователя на машины со статусом модерации. У отклонённой показываем причину администратора. */
export function ApplicationsList({ cars }: { cars: PartnerCar[] }) {
  if (cars.length === 0) return null
  return (
    <section aria-labelledby="applications-title">
      <h2 id="applications-title" className="mb-2 text-lg font-bold text-fg">
        Ваши заявки
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {cars.map((c) => (
          <li key={c.id} className="flex items-start gap-3 p-3">
            <CarPhoto src={c.photos[0]} className="h-14 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">
                {c.make} {c.model}, {c.year}
              </p>
              <p className="truncate text-xs text-muted">{c.plateNumber}</p>
              {c.moderationStatus === 'rejected' && c.rejectionReason && <p className="mt-1 text-sm text-danger">Причина отказа: {c.rejectionReason}</p>}
            </div>
            <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-fg">{MODERATION_LABEL[c.moderationStatus]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
