import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'
import { groupTripsApi } from '../api'
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS, ROUTE_MAX, todayInMinsk } from '../rules'

/**
 * Правила из бэка (GroupTripRules/CreateGroupTripRequest): маршрут до 300 символов, участников от 2 до 50 (включая
 * организатора), дата сегодня или позже (по минскому времени).
 */
const schema = z.object({
    route: z.string().trim().min(1, 'Укажите маршрут').max(ROUTE_MAX, `Маршрут не длиннее ${ROUTE_MAX} символов`),
    maxParticipants: z
        .string()
        .trim()
        .min(1, 'Укажите число участников')
        .refine((v) => /^\d+$/.test(v), 'Введите целое число')
        .refine((v) => Number(v) >= MIN_PARTICIPANTS && Number(v) <= MAX_PARTICIPANTS, `От ${MIN_PARTICIPANTS} до ${MAX_PARTICIPANTS} (включая вас)`),
    date: z.string().min(1, 'Укажите дату поездки').refine((v) => v >= todayInMinsk(), 'Дата поездки не может быть в прошлом'),
})
type FormValues = z.infer<typeof schema>

/** B17. Создание групповой поездки: POST /group-trips. Создатель сразу становится организатором и участником. */
export default function GroupTripCreatePage() {
    const navigate = useNavigate()
    const qc = useQueryClient()
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { route: '', maxParticipants: '', date: '' } })

    const create = useMutation({
        mutationFn: (v: FormValues) => groupTripsApi.create({ route: v.route, maxParticipants: Number(v.maxParticipants), date: v.date }),
        onSuccess: (trip) => {
            qc.invalidateQueries({ queryKey: ['group-trips', 'list'] })
            toast.success('Поездка создана.')
            navigate(`/app/group-trips/${trip.id}`, { replace: true })
        },
        onError: (e) => {
            if (e instanceof ApiError && e.fields) {
                for (const [name, message] of Object.entries(e.fields)) {
                    if (name === 'route' || name === 'maxParticipants' || name === 'date') setError(name, { message })
                }
            }
            toast.error(errorMessage(e))
        },
    })

    return (
        <div className="mx-auto max-w-xl px-4 pb-10 pt-4">
            <Link to="/app/group-trips" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> Групповые поездки
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg">Новая поездка</h1>
            <p className="mt-1 text-sm text-muted">Опишите маршрут и дату. Участники присоединяются сами и бронируют машины отдельно.</p>

            <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="mt-5 space-y-4 rounded-3xl border border-line bg-surface p-5">
                <TextField label="Маршрут" placeholder="Например, Минск – Брест" error={errors.route?.message} {...register('route')} />
                <TextField
                    label="Максимум участников"
                    type="number"
                    inputMode="numeric"
                    min={MIN_PARTICIPANTS}
                    max={MAX_PARTICIPANTS}
                    hint={`Считая вас: от ${MIN_PARTICIPANTS} до ${MAX_PARTICIPANTS}.`}
                    error={errors.maxParticipants?.message}
                    {...register('maxParticipants')}
                />
                <TextField label="Дата поездки" type="date" min={todayInMinsk()} error={errors.date?.message} {...register('date')} />
                <div className="pt-1">
                    <Button type="submit" loading={create.isPending}>
                        {create.isPending ? 'Создаём…' : 'Создать поездку'}
                    </Button>
                </div>
            </form>
        </div>
    )
}