import { useState } from 'react'
import { Navigate } from 'react-router'
import { useMe } from '@/features/auth/hooks'
import { ApplicationsList } from '../components/ApplicationsList'
import { CarForm } from '../components/CarForm'
import { usePartnerCars } from '../hooks'

/**
 * B24. «Стать партнёром»: форма машины (та же, что P3) и статус заявок. Заявка уходит администратору (по ТЗ проверка до 24 часов),
 * пока она на рассмотрении пользователь остаётся арендатором. После одобрения isPartner станет true, и откроется кабинет партнёра
 * (придёт уведомление car_approved). Партнёрам форма не нужна: для новой машины есть кабинет.
 */
export default function BecomePartnerPage() {
    const { data: me } = useMe()
    const cars = usePartnerCars()
    const [sent, setSent] = useState(0)

    if (me?.isPartner) return <Navigate to="/partner/cars/new" replace />

    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-fg">Стать партнёром</h1>
                <p className="mt-1 text-sm text-muted">Опишите машину, которую хотите сдавать. Администратор проверит заявку, и после одобрения откроется кабинет партнёра. Пока заявка на рассмотрении, вы остаётесь арендатором.</p>
            </header>

            {sent > 0 && (
                <p role="status" className="rounded-2xl border border-line bg-accent p-4 text-sm text-accent-fg">
                    Заявка отправлена. Ответ придёт уведомлением.
                </p>
            )}

            {cars.data && <ApplicationsList cars={cars.data} />}

            <div>
                <h2 className="mb-2 text-lg font-bold text-fg">{cars.data && cars.data.length > 0 ? 'Ещё одна машина' : 'Данные машины'}</h2>
                <CarForm key={sent} onDone={() => setSent((n) => n + 1)} />
            </div>
        </div>
    )
}