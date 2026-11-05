import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { SelectField } from '@/features/support/components/FormFields'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { Pager } from '../components/Pager'
import { Pill, VerificationPill } from '../components/Pills'
import { useAdminUsers } from '../hooks'
import { fullName, parseUserFilters, userFiltersToParams, userFiltersToQuery } from '../logic'
import type { UserFilters } from '../types'
import { useDebounced } from '../useDebounced'

/**
 * AD3. Пользователи: GET /admin/users с фильтрами (статус ВУ, партнёр, заблокирован), поиском q и страницами по 20.
 * Фильтры и страница хранятся в адресе, поэтому плитки дашборда могут вести сразу на нужный список (например ?blocked=yes).
 */
export default function AdminUsersPage() {
    const [sp, setSp] = useSearchParams()
    const filters = parseUserFilters(sp)
    const [search, setSearch] = useState(filters.q)
    const debounced = useDebounced(search)
    const list = useAdminUsers(userFiltersToQuery(filters))

    const update = (patch: Partial<UserFilters>) => setSp(userFiltersToParams({ ...filters, page: 0, ...patch }), { replace: true })

    // поиск уходит в адрес после паузы в наборе; при смене адреса извне (например, ссылка с дашборда) поле синхронизируется
    useEffect(() => {
        if (debounced.trim() !== filters.q.trim()) update({ q: debounced })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced])
    useEffect(() => setSearch(filters.q), [filters.q])

    const items = list.data?.items ?? []

    return (
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Пользователи</h1>

            <div className="mt-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-4">
                    <label htmlFor="user-search" className="mb-1.5 block text-xs font-medium text-fg">
                        Поиск
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                        <input
                            id="user-search"
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Имя, фамилия, email или телефон"
                            className="w-full rounded-xl border border-line bg-surface py-3 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
                <SelectField label="Водительское удостоверение" value={filters.verificationStatus} onChange={(e) => update({ verificationStatus: e.target.value as UserFilters['verificationStatus'] })}>
                    <option value="">Любой статус</option>
                    <option value="unverified">Не подтверждён</option>
                    <option value="pending">На проверке</option>
                    <option value="verified">Подтверждён</option>
                </SelectField>
                <SelectField label="Партнёр" value={filters.partner} onChange={(e) => update({ partner: e.target.value as UserFilters['partner'] })}>
                    <option value="">Все</option>
                    <option value="yes">Только партнёры</option>
                    <option value="no">Не партнёры</option>
                </SelectField>
                <SelectField label="Блокировка" value={filters.blocked} onChange={(e) => update({ blocked: e.target.value as UserFilters['blocked'] })}>
                    <option value="">Все</option>
                    <option value="yes">Заблокированные</option>
                    <option value="no">Не заблокированные</option>
                </SelectField>
                <div className="flex items-end">
                    <Button variant="outline" onClick={() => setSp({}, { replace: true })} className="sm:w-auto">
                        Сбросить
                    </Button>
                </div>
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-2" aria-hidden>
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="h-14 rounded-2xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить пользователей</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">По этим фильтрам пользователей нет.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
                            <table className="w-full min-w-[44rem] text-left text-sm">
                                <thead className="border-b border-line text-xs text-muted">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Пользователь</th>
                                    <th className="px-4 py-3 font-medium">Контакты</th>
                                    <th className="px-4 py-3 font-medium">ВУ</th>
                                    <th className="px-4 py-3 font-medium">Метки</th>
                                    <th className="px-4 py-3 font-medium">Рейтинг</th>
                                    <th className="px-4 py-3 font-medium">Регистрация</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                {items.map((u) => (
                                    <tr key={u.id} className="transition-colors hover:bg-surface-2">
                                        <td className="px-4 py-3">
                                            <Link to={`/admin/users/${u.id}`} className="font-semibold text-fg hover:underline">
                                                {fullName(u)}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            <span className="block">{u.email}</span>
                                            <span className="block text-xs">{u.phone}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <VerificationPill status={u.verificationStatus} />
                                        </td>
                                        <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          {u.partner && <Pill>Партнёр</Pill>}
                            {u.blocked && <Pill warn>Заблокирован</Pill>}
                        </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{u.ratingAvg !== null ? u.ratingAvg.toFixed(1).replace('.', ',') : '—'}</td>
                                        <td className="px-4 py-3 text-xs text-muted">{formatDateTime(u.createdAt)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager page={filters.page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => update({ page: p })} />
                    </>
                )}
            </div>
        </div>
    )
}