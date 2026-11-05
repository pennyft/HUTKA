import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { adminCarBadges, CAR_TABS, parseCarTab } from '../cars/logic'
import { useAdminCars } from '../cars/hooks'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'

/**
 * AD6. Машины: вкладки «Заявки» (основная очередь модерации, старые первыми), «Одобренные», «Отклонённые», «Скрыты по неявкам»,
 * «Скрыты администратором». GET /admin/cars. Список «все машины» бэк не умеет: без статуса он возвращает заявки. Вкладка и страница
 * хранятся в адресе (?tab=strikes&page=2), на заявки ведут плитки дашборда.
 */
export default function AdminCarsPage() {
    const [sp, setSp] = useSearchParams()
    const tab = parseCarTab(sp.get('tab') ?? sp.get('moderationStatus'))
    const pageParam = Number(sp.get('page'))
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
    const list = useAdminCars(tab, page)
    const items = list.data?.items ?? []
    const go = (t: string, p = 0) => setSp({ ...(t === 'pending' ? {} : { tab: t }), ...(p > 0 ? { page: String(p + 1) } : {}) }, { replace: true })

    return (
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Машины</h1>

            <div role="group" aria-label="Список машин" className="mt-4 flex flex-wrap gap-2">
                {CAR_TABS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        aria-pressed={tab === t.value}
                        onClick={() => go(t.value)}
                        className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${tab === t.value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} className="h-24 rounded-3xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить машины</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">{tab === 'pending' ? 'Заявок на модерацию нет.' : 'В этом списке пока пусто.'}</p>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {items.map((c) => (
                                <li key={c.id}>
                                    <Link to={`/admin/cars/${c.id}`} className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2">
                                        <CarPhoto src={c.photos[0]} className="h-20 w-28 shrink-0 rounded-2xl" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-fg">
                                                {c.make} {c.model}, {c.year}
                                            </p>
                                            <p className="truncate text-sm text-muted">
                                                {c.plateNumber} · {c.partnerName ?? c.partnerEmail ?? 'партнёр'} · {formatMoney(c.pricePerHour)}/ч
                                            </p>
                                            <p className="mt-1 flex flex-wrap gap-1.5">
                                                {adminCarBadges(c).map((b) => (
                                                    <Pill key={b.label} warn={b.warn}>
                                                        {b.label}
                                                    </Pill>
                                                ))}
                                            </p>
                                        </div>
                                        <span className="hidden shrink-0 text-xs text-muted sm:block">заявка {formatDateTime(c.createdAt)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => go(tab, p)} />
                    </>
                )}
            </div>
        </div>
    )
}