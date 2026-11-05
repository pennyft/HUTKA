import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation } from 'react-router'
import { Button } from '@/shared/ui/Button'
import { Checkbox, TextField } from '@/shared/ui/fields'
import { SelectField, TextAreaField } from '../components/FormFields'
import { useCreateTicket } from '../hooks'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../labels'
import { cabinetOf, draftToValues, readDraft, supportBase } from '../logic'
import { asCategory, SUBJECT_MAX, TEXT_MAX, ticketSchema, type TicketFormValues } from '../schema'

/**
 * B20. Новое обращение: POST /tickets {category, subject, description, priority, audience} → 201.
 * audience берётся из кабинета (renter или partner). «Срочное» ставят, только если нужна немедленная реакция.
 * Форму можно предзаполнить через location.state.draft: так её откроет AI-помощник (B22, поле ticketDraft).
 */
export default function TicketCreatePage() {
    const location = useLocation()
    const cabinet = cabinetOf(location.pathname)
    const base = supportBase(cabinet)
    const defaults = useMemo(() => draftToValues(readDraft(location.state)), [location.state])
    const create = useCreateTicket(cabinet)
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<TicketFormValues>({ resolver: zodResolver(ticketSchema), defaultValues: defaults })

    const descriptionLength = watch('description')?.length ?? 0

    function onSubmit(v: TicketFormValues) {
        create.mutate({
            category: asCategory(v.category),
            subject: v.subject,
            description: v.description,
            priority: v.urgent ? 'urgent' : 'normal',
            audience: cabinet,
        })
    }

    return (
        <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
            <Link to={base} className="text-sm text-muted underline hover:opacity-80">
                Все обращения
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Новое обращение</h1>
            <p className="mt-1 text-sm text-muted">Опишите проблему, ответ придёт в переписку и уведомлением.</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
                <SelectField label="Категория" error={errors.category?.message} {...register('category')}>
                    <option value="">Выберите категорию</option>
                    {CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                        </option>
                    ))}
                </SelectField>
                <TextField label="Тема" maxLength={SUBJECT_MAX} placeholder="Коротко о проблеме" error={errors.subject?.message} {...register('subject')} />
                <TextAreaField
                    label="Описание"
                    rows={7}
                    maxLength={TEXT_MAX}
                    placeholder="Что случилось, когда и в какой брони"
                    error={errors.description?.message}
                    hint={descriptionLength > TEXT_MAX - 500 ? `${descriptionLength} из ${TEXT_MAX}` : undefined}
                    {...register('description')}
                />
                <Checkbox {...register('urgent')}>Срочно: ситуация требует немедленного внимания</Checkbox>
                <div className="pt-2">
                    <Button type="submit" variant="dark" loading={create.isPending}>
                        {create.isPending ? 'Отправляем…' : 'Отправить'}
                    </Button>
                </div>
            </form>
        </div>
    )
}