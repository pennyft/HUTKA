import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { Pager } from '../components/Pager'
import { ReasonForm } from '../components/ReasonForm'
import { useLicenseActions, useLicenseRequests } from '../hooks'
import { formatDay, fullName } from '../logic'
import type { LicenseRequest } from '../types'

function RequestCard({ r }: { r: LicenseRequest }) {
    const { approve, reject } = useLicenseActions()
    const [rejecting, setRejecting] = useState(false)
    return (
        <li className="rounded-3xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <Link to={`/admin/users/${r.userId}`} className="text-lg font-bold text-fg hover:underline">
                        {fullName(r)}
                    </Link>
                    <p className="text-sm text-muted">
                        {r.email} · {r.phone}
                    </p>
                </div>
                <span className="text-xs text-muted">регистрация {formatDateTime(r.registeredAt)}</span>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                    <dt className="text-xs text-muted">Номер ВУ</dt>
                    <dd className="font-semibold text-fg">{r.licenseNumber}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted">Дата выдачи</dt>
                    <dd className="font-medium text-fg">{formatDay(r.licenseIssueDate)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted">Дата рождения</dt>
                    <dd className="font-medium text-fg">{formatDay(r.birthDate)}</dd>
                </div>
            </dl>
            {r.licenseRejectionReason && <p className="mt-2 text-xs text-muted">Прошлый отказ: {r.licenseRejectionReason}</p>}

            <div className="mt-4">
                {rejecting ? (
                    <ReasonForm
                        label="Причина отказа (её увидит пользователь)"
                        submitLabel="Отклонить"
                        loading={reject.isPending}
                        onCancel={() => setRejecting(false)}
                        onSubmit={(reason) => reject.mutate({ id: r.userId, reason }, { onSuccess: () => setRejecting(false) })}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                        <Button variant="dark" loading={approve.isPending} onClick={() => approve.mutate(r.userId)}>
                            Подтвердить
                        </Button>
                        <Button variant="outline" disabled={approve.isPending} onClick={() => setRejecting(true)}>
                            Отклонить
                        </Button>
                    </div>
                )}
            </div>
        </li>
    )
}

/**
 * AD5. Очередь проверки ВУ: GET /admin/users/license-requests (заявки pending, самые давние регистрации первыми).
 * Администратор сверяет формат и заполненность номера и даты выдачи и подтверждает либо отклоняет с причиной: при отказе пользователь
 * возвращается в unverified и получает причину уведомлением. Даты подачи заявки в данных нет, только дата регистрации.
 */
export default function AdminLicenseRequestsPage() {
    const [sp, setSp] = useSearchParams()
    const pageParam = Number(sp.get('page'))
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
    const list = useLicenseRequests(page)
    const items = list.data?.items ?? []

    return (
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Проверка водительских удостоверений</h1>
            <p className="mt-1 text-sm text-muted">Сверьте формат номера и заполненность данных. Подтверждение открывает бронирование, тест ПДД, групповые поездки и партнёрство.</p>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-40 rounded-3xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить очередь</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <ShieldCheck className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">Очередь пуста</h2>
                        <p className="mt-1 text-sm text-muted">Новых заявок на проверку нет.</p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {items.map((r) => (
                                <RequestCard key={r.userId} r={r} />
                            ))}
                        </ul>
                        <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => setSp(p > 0 ? { page: String(p + 1) } : {}, { replace: true })} />
                    </>
                )}
            </div>
        </div>
    )
}