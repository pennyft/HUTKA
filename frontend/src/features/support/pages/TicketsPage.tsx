import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { LifeBuoy } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { TicketRow } from '../components/TicketRow'
import { useTickets } from '../hooks'
import { cabinetOf, parseStatusFilter, supportBase, type StatusFilter } from '../logic'

const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'open', label: 'Открытые' },
    { value: 'closed', label: 'Закрытые' },
]

/**
 * B19. Поддержка: GET /tickets?audience=renter|partner&status=open|closed (по 20, последняя активность сверху).
 * Страница общая для двух кабинетов: audience берётся из адреса. Фильтр хранится в адресе (?status=open).
 */
export default function TicketsPage() {
    const cabinet = cabinetOf(useLocation().pathname)
    const base = supportBase(cabinet)
    const [sp, setSp] = useSearchParams()
    const filter = parseStatusFilter(sp.get('status'))
    const now = useNow(60_000)
    const list = useTickets(cabinet, filter)
    const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])

    return (
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-fg">Поддержка</h1>
                    <p className="mt-1 text-sm text-muted">Ваши обращения и ответы поддержки.</p>
                </div>
                <Link to={`${base}/new`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                    Создать обращение
                </Link>
            </div>

            <div role="group" aria-label="Фильтр обращений" className="mt-4 flex gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        type="button"
                        aria-pressed={filter === f.value}
                        onClick={() => setSp(f.value === 'all' ? {} : { status: f.value }, { replace: true })}
                        className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${filter === f.value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить обращения</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <LifeBuoy className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">{filter === 'all' ? 'Обращений пока нет' : 'Здесь пока пусто'}</h2>
                        <p className="mt-1 text-sm text-muted">
                            {filter === 'all' ? 'Если что-то пошло не так, напишите нам: ответим в переписке.' : 'Попробуйте другой фильтр.'}
                        </p>
                        {filter !== 'all' && (
                            <button type="button" onClick={() => setSp({}, { replace: true })} className="mt-3 text-sm font-medium text-fg underline hover:opacity-80">
                                Показать все
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                            {items.map((t) => (
                                <TicketRow key={t.id} ticket={t} to={`${base}/${t.id}`} now={now} />
                            ))}
                        </ul>
                        {list.hasNextPage && (
                            <div className="mt-5 flex justify-center">
                                <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="sm:w-auto sm:px-8">
                                    Показать ещё
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}