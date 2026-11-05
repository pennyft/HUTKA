import { Link } from 'react-router'
import { Heart } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { CarCard, CarCardSkeleton } from '@/features/cars/components/CarCard'
import { formatCarsCount } from '@/features/cars/format'
import { useFavorites } from '@/shared/favorites/useFavorites'
import { Button } from '@/shared/ui/Button'

/**
 * B6. Избранное: GET /favorites (до 200 машин, массив). Снять сердечко можно прямо в карточке: машина
 * исчезает из списка сразу (кэш правится до ответа сервера, при ошибке возвращается). Доступно и без подтверждённого ВУ.
 */
export default function FavoritesPage() {
    const { data, isPending, isError, error, refetch } = useFavorites()

    return (
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
            <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-fg">Избранное</h1>
                {data && data.length > 0 && <p className="text-sm text-muted">{formatCarsCount(data.length)}</p>}
            </div>

            <div className="mt-4">
                {isPending ? (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
                        {Array.from({ length: 6 }, (_, i) => (
                            <CarCardSkeleton key={i} />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить избранное</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <Heart className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">Пока пусто</h2>
                        <p className="mt-1 text-sm text-muted">Нажимайте на сердечко у машин в каталоге, и они появятся здесь.</p>
                        <Link to="/cars" className="mt-5 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                            В каталог
                        </Link>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                        {data.map((car) => (
                            <li key={car.id}>
                                <CarCard car={car} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}