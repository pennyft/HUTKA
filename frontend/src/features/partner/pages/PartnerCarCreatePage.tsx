import { Link, useNavigate } from 'react-router'
import { CarForm } from '../components/CarForm'

/** P3. Добавление машины в кабинете партнёра: та же форма, что у «Стать партнёром». После отправки ведём к списку машин, где заявка видна со статусом. */
export default function PartnerCarCreatePage() {
    const navigate = useNavigate()
    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/partner/cars" className="text-sm text-muted underline hover:opacity-80">
                    Мои машины
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Добавление машины</h1>
                <p className="mt-1 text-sm text-muted">Новая машина сначала проходит модерацию администратора, и только потом появляется в каталоге.</p>
            </div>
            <CarForm onDone={() => navigate('/partner/cars')} />
        </div>
    )
}