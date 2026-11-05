import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useAuthStore } from '@/features/auth/store'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { CarReviewList } from '../api'
import { formatReviewDate } from '../format'
import { useCarReviews } from './useCarReviews'

/**
 * Отзывы о машине. GET /ratings на бэке требует токен, поэтому гостю вместо списка показываем приглашение войти.
 * Бэк отдаёт новые первыми, страница 20 штук; если отзывов больше, честно пишем, сколько показано.
 */
export function CarReviews({ carId }: { carId: string }) {
  const token = useAuthStore((s) => s.token)
  const { data, isPending, isError, error, refetch } = useCarReviews(carId)

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-lg font-bold text-fg">
        Отзывы
      </h2>
      <div className="mt-2">
        {!token ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            Отзывы доступны после входа.{' '}
            <Link to="/login" state={{ from: `/cars/${carId}` }} className="font-medium text-fg underline hover:opacity-80">
              Войти
            </Link>
          </p>
        ) : isPending ? (
          <div className="space-y-3" aria-hidden>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            Не удалось загрузить отзывы: {errorMessage(error)}{' '}
            <button type="button" onClick={() => refetch()} className="font-medium text-fg underline hover:opacity-80">
              Повторить
            </button>
          </p>
        ) : (
          <ReviewList data={data} />
        )}
      </div>
    </section>
  )
}

function ReviewList({ data }: { data: CarReviewList }) {
  if (data.ratings.length === 0) return <p className="text-sm text-muted">Пока нет отзывов.</p>
  return (
    <>
      <ul>
        {data.ratings.map((r) => (
          <li key={r.id} className="border-t border-line py-3 first:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-fg">{r.authorFirstName || 'Арендатор'}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-0.5 text-fg">
                  <Star className="size-3.5 fill-current" aria-hidden />
                  <span aria-label={`Оценка ${r.score} из 5`}>{r.score}</span>
                </span>
                {formatReviewDate(r.createdAt)}
              </span>
            </div>
            {r.comment && <p className="mt-1 whitespace-pre-line text-sm text-fg">{r.comment}</p>}
          </li>
        ))}
      </ul>
      {data.ratingsCount > data.ratings.length && (
        <p className="mt-1 text-xs text-muted">
          Показаны {data.ratings.length} из {data.ratingsCount}
        </p>
      )}
    </>
  )
}
