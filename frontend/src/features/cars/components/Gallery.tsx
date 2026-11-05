import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FavoriteButton } from '@/shared/favorites/FavoriteButton'
import type { Car } from '@/shared/types/car'
import { CarPhoto } from './CarPhoto'

/**
 * Галерея: большое фото, стрелки, счётчик и лента миниатюр. На телефоне листается свайпом.
 * Если фото нет, показывается заглушка (CarPhoto).
 */
export function Gallery({ car }: { car: Car }) {
  const photos = car.photos ?? []
  const count = photos.length
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const current = Math.min(index, Math.max(count - 1, 0))

  const go = (delta: number) => {
    if (count > 1) setIndex((current + delta + count) % count)
  }

  return (
    <div>
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-surface-2"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return
          const dx = e.changedTouches[0].clientX - touchStart.current
          touchStart.current = null
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        }}
      >
        <CarPhoto src={photos[current]} className="size-full" />
        <FavoriteButton car={car} className="absolute right-3 top-3" />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-fg transition-transform hover:scale-105 active:scale-95">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Следующее фото" className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-fg transition-transform hover:scale-105 active:scale-95">
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 left-3 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-fg" aria-live="polite">
              {current + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {photos.map((src, i) => (
            <li key={`${src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Фото ${i + 1} из ${count}`}
                aria-current={i === current ? 'true' : undefined}
                className={`block h-14 w-20 overflow-hidden rounded-xl border-2 transition-colors ${i === current ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100'}`}
              >
                <CarPhoto src={src} className="size-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
