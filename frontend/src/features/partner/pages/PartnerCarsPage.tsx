import { Link } from 'react-router'
import { CarFront } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { PartnerCarCard } from '../components/PartnerCarCard'
import { usePartnerCars } from '../hooks'

/** P2. Мои машины: GET /partner/cars (с заявками на модерации), скрыть или показать, удалить, перейти к правке. Кнопка «Добавить машину» ведёт к форме P3. */
export default function PartnerCarsPage() {
    const { data, isPending, isError, error, refetch } = usePartnerCars()
    return (
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-fg">Мои машины</h1>
                    <p className="mt-1 text-sm text-muted">Состояние, рейтинг и доход за месяц по каждой машине.</p>
                </div>
                <Link to="/partner/cars/new" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                    Добавить машину
                </Link>
            </div>

            <div className="mt-4">
                {isPending ? (
                    <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
                        {Array.from({ length: 2 }, (_, i) => (
                            <Skeleton key={i} className="h-72 rounded-3xl" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить машины</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <CarFront className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">Машин пока нет</h2>
                        <p className="mt-1 text-sm text-muted">Добавьте машину, она пройдёт модерацию и появится в каталоге.</p>
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2">
                        {data.map((c) => (
                            <PartnerCarCard key={c.id} car={c} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}