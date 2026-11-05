import type { MouseEvent } from 'react'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/features/auth/store'
import type { Car } from '@/shared/types/car'
import { useFavorites, useToggleFavorite } from './useFavorites'

/** Сердечко «в избранное». Гость по клику уходит на вход. Кнопка не должна лежать внутри ссылки (см. CarCard). */
export function FavoriteButton({ car, className = '' }: { car: Car; className?: string }) {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const { data } = useFavorites()
  const toggle = useToggleFavorite()
  const isFav = !!data?.some((c) => c.id === car.id)

  function onClick(e: MouseEvent) {
    e.stopPropagation()
    if (!token) {
      navigate('/login')
      return
    }
    toggle.mutate({ car, isFav })
  }

  return (
    <button
      type="button"
      aria-pressed={isFav}
      aria-label={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-full bg-surface text-fg transition-transform hover:scale-105 active:scale-95 ${className}`}
    >
      <Heart className={`size-[18px] ${isFav ? 'fill-danger text-danger' : ''}`} aria-hidden />
    </button>
  )
}
