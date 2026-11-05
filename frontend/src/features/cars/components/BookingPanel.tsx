import { Button } from '@/shared/ui/Button'
import { useAuthStore } from '@/features/auth/store'
import type { Car } from '@/shared/types/car'
import { formatPrice } from '../format'
import { bookingModeNote, type BookCta } from './useBookCta'

/** Карточка с ценой и кнопкой справа (компьютер). На телефоне вместо неё нижняя полоса (MobileBookBar). */
export function BookingCard({ car, cta }: { car: Car; cta: BookCta }) {
  const mode = bookingModeNote(car)
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <p className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-fg">{formatPrice(car.pricePerHour)}</span>
        <span className="text-sm text-muted">BYN в час</span>
      </p>
      <span className="mt-3 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg">{mode.badge}</span>
      <p className="mt-2 text-sm text-muted">{mode.text}</p>
      <div className="mt-4">
        <Button onClick={cta.onClick} disabled={cta.disabled}>
          {cta.label}
        </Button>
      </div>
      {cta.note && <p className="mt-3 text-sm text-fg">{cta.note}</p>}
      <p className="mt-3 text-xs text-muted">Стоимость зависит от времени аренды. Оплата списывается после завершения поездки.</p>
    </div>
  )
}

/**
 * Нижняя полоса на телефоне: цена и кнопка всегда под рукой. Залипает над нижней панелью меню
 * (она есть только у залогиненного пользователя, поэтому отступ зависит от токена).
 */
export function MobileBookBar({ car, cta }: { car: Car; cta: BookCta }) {
  const token = useAuthStore((s) => s.token)
  const mode = bookingModeNote(car)
  return (
    <div className={`sticky z-20 -mx-4 mt-6 border-t border-line bg-surface px-4 py-3 lg:hidden ${token ? 'bottom-14' : 'bottom-0'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-fg">
            {formatPrice(car.pricePerHour)} <span className="text-xs font-normal text-muted">BYN/ч</span>
          </p>
          <p className="truncate text-xs text-muted">{mode.badge}</p>
        </div>
        <Button onClick={cta.onClick} disabled={cta.disabled} className="w-auto shrink-0 px-6">
          {cta.label === 'Войти, чтобы забронировать' ? 'Войти' : cta.label}
        </Button>
      </div>
      {cta.note && <p className="mt-2 text-xs text-fg">{cta.note}</p>}
    </div>
  )
}
