import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Star } from 'lucide-react'
import { ApiError, errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Pill, VerificationPill } from '../components/Pills'
import { ReasonForm } from '../components/ReasonForm'
import { useAdminUser, useUserActions, useUserRatings } from '../hooks'
import { formatDay, fullName } from '../logic'
import type { AdminRatingItem } from '../types'

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1.5 text-sm">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-fg">{value}</dd>
        </div>
    )
}

function RatingRow({ r }: { r: AdminRatingItem }) {
    return (
        <li className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 font-semibold text-fg" aria-label={`Оценка ${r.score} из 5`}>
          <Star className="size-4" aria-hidden />
            {r.score}
        </span>
                <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
                {r.authorName ?? 'Автор неизвестен'} · {r.toCarId ? 'оценка машины' : 'оценка пользователя'} ·{' '}
                <Link to={`/admin/bookings/${r.bookingId}`} className="underline hover:text-fg">
                    бронь
                </Link>
            </p>
            {r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-fg">{r.comment}</p>}
        </li>
    )
}

/**
 * AD4. Профиль пользователя: данные, водительское удостоверение, статистика, оценки, блокировка. GET /admin/users/{id}.
 * Блокировка требует причину (до 500 символов): заблокированный не может войти, его выданные токены перестают работать.
 * Полная история аренд пользователя на экране броней (AD8): ссылка ведёт туда с фильтром userId.
 */
export default function AdminUserPage() {
    const { userId = '' } = useParams()
    const { data: u, isPending, isError, error, refetch } = useAdminUser(userId)
    const { block, unblock } = useUserActions()
    const [blocking, setBlocking] = useState(false)
    const [allRatings, setAllRatings] = useState(false)
    const ratings = useUserRatings(userId, allRatings)

    if (isPending) return <div className="mx-auto max-w-3xl space-y-3 px-4 pt-6"><Skeleton className="h-10 w-1/2" aria-hidden /><Skeleton className="h-64 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Пользователь не найден' : 'Не удалось загрузить пользователя'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/admin/users" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все пользователи
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const shownRatings = allRatings ? (ratings.data?.pages.flatMap((p) => p.items) ?? []) : u.recentRatings

    return (
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/admin/users" className="text-sm text-muted underline hover:opacity-80">
                    Все пользователи
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">{fullName(u)}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                    <VerificationPill status={u.verificationStatus} />
                    {u.partner && <Pill>Партнёр</Pill>}
                    {u.blocked && <Pill warn>Заблокирован</Pill>}
                    {!u.emailVerified && <Pill warn>Email не подтверждён</Pill>}
                </div>
            </div>

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-1 font-bold text-fg">Данные</h2>
                <dl className="divide-y divide-line">
                    <Row label="Email" value={u.email} />
                    <Row label="Телефон" value={u.phone} />
                    <Row label="Дата рождения" value={formatDay(u.birthDate)} />
                    <Row label="Регистрация" value={formatDateTime(u.createdAt)} />
                    <Row label="Рейтинг" value={u.ratingAvg !== null ? u.ratingAvg.toFixed(1).replace('.', ',') : 'нет оценок'} />
                </dl>
            </section>

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-1 font-bold text-fg">Водительское удостоверение</h2>
                <dl className="divide-y divide-line">
                    <Row label="Статус" value={<VerificationPill status={u.verificationStatus} />} />
                    <Row label="Номер" value={u.licenseNumber ?? '—'} />
                    <Row label="Дата выдачи" value={formatDay(u.licenseIssueDate)} />
                    {u.licenseRejectionReason && <Row label="Причина прошлого отказа" value={u.licenseRejectionReason} />}
                </dl>
                {u.verificationStatus === 'pending' && (
                    <Link to="/admin/license-requests" className="mt-3 inline-block text-sm font-semibold text-fg underline hover:opacity-80">
                        Открыть очередь проверки
                    </Link>
                )}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-1 font-bold text-fg">Активность</h2>
                <dl className="divide-y divide-line">
                    <Row label="Аренд всего" value={u.stats.bookingsTotal} />
                    <Row label="Завершено" value={u.stats.bookingsFinished} />
                    <Row label="Отменено" value={u.stats.bookingsCancelled} />
                    <Row label="Машин у партнёра" value={u.stats.carsCount} />
                    <Row label="Оценок" value={u.stats.ratingsCount} />
                </dl>
                <Link to={`/admin/bookings?userId=${u.id}`} className="mt-3 inline-block text-sm font-semibold text-fg underline hover:opacity-80">
                    История аренд пользователя
                </Link>
            </section>

            <section aria-labelledby="ratings-title">
                <div className="mb-2 flex items-baseline justify-between">
                    <h2 id="ratings-title" className="text-lg font-bold text-fg">
                        {allRatings ? 'Все оценки' : 'Последние оценки'}
                    </h2>
                    {!allRatings && u.stats.ratingsCount > u.recentRatings.length && (
                        <button type="button" onClick={() => setAllRatings(true)} className="text-sm text-muted underline hover:text-fg">
                            Показать все
                        </button>
                    )}
                </div>
                {allRatings && ratings.isPending ? (
                    <Skeleton className="h-20 rounded-3xl" aria-hidden />
                ) : allRatings && ratings.isError ? (
                    <p className="text-sm text-muted">{errorMessage(ratings.error)}</p>
                ) : shownRatings.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-muted">Оценок пока нет.</p>
                ) : (
                    <>
                        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                            {shownRatings.map((r) => (
                                <RatingRow key={r.id} r={r} />
                            ))}
                        </ul>
                        {allRatings && ratings.hasNextPage && (
                            <div className="mt-4 flex justify-center">
                                <Button variant="outline" loading={ratings.isFetchingNextPage} onClick={() => ratings.fetchNextPage()} className="sm:w-auto sm:px-8">
                                    Показать ещё
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-2 font-bold text-fg">Блокировка</h2>
                {u.blocked ? (
                    <>
                        <dl className="divide-y divide-line">
                            <Row label="Причина" value={u.blockedReason ?? '—'} />
                            <Row label="Когда" value={u.blockedAt ? formatDateTime(u.blockedAt) : '—'} />
                        </dl>
                        <div className="mt-3">
                            <Button variant="outline" loading={unblock.isPending} onClick={() => unblock.mutate(u.id)} className="sm:w-auto">
                                Разблокировать
                            </Button>
                        </div>
                    </>
                ) : blocking ? (
                    <ReasonForm
                        label="Причина блокировки"
                        submitLabel="Заблокировать"
                        loading={block.isPending}
                        onCancel={() => setBlocking(false)}
                        onSubmit={(reason) => block.mutate({ id: u.id, reason }, { onSuccess: () => setBlocking(false) })}
                    />
                ) : (
                    <>
                        <p className="text-sm text-muted">Заблокированный пользователь не сможет войти, а его выданные токены перестанут работать. Причину увидит он сам.</p>
                        <div className="mt-3">
                            <Button variant="outline" onClick={() => setBlocking(true)} className="sm:w-auto">
                                Заблокировать
                            </Button>
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}