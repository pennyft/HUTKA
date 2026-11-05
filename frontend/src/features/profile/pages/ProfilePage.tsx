import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { profileApi } from '../api'
import { authApi } from '@/features/auth/api'
import { useMe } from '@/features/auth/hooks'
import { useAuthStore } from '@/features/auth/store'
import type { User, VerificationStatus } from '@/features/auth/types'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Loading } from '@/shared/ui/Loading'
import { TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'
import { useState } from 'react'

/**
 * Лимиты из auth/dto/UpdateProfileRequest.java: имя и фамилия ≤100, телефон ≤30. Пустые значения бэк отклоняет
 * (400 «… не может быть пустым»). Правило +375 то же, что в регистрации: оно из макета, бэк его не проверяет.
 */
const schema = z.object({
  firstName: z.string().trim().min(1, 'Обязательное поле').max(100, 'Не больше 100 символов'),
  lastName: z.string().trim().min(1, 'Обязательное поле').max(100, 'Не больше 100 символов'),
  phone: z
    .string()
    .trim()
    .min(1, 'Обязательное поле')
    .max(30, 'Не больше 30 символов')
    .refine((v) => v.replace(/\D/g, '').startsWith('375'), 'Введите белорусский номер (+375)')
    .refine((v) => {
      const n = v.replace(/\D/g, '').length
      return n >= 11 && n <= 13
    }, 'Введите корректный номер телефона'),
})
type FormValues = z.infer<typeof schema>

const STATUS_LABEL: Record<VerificationStatus, string> = {
  unverified: 'Не подтверждено',
  pending: 'На проверке',
  verified: 'Подтверждено',
}

const STATUS_PILL: Record<VerificationStatus, string> = {
  unverified: 'border-line bg-surface text-fg',
  pending: 'border-line bg-surface-2 text-fg',
  verified: 'border-primary bg-accent text-accent-fg',
}

/** YYYY-MM-DD → ДД.ММ.ГГГГ без перевода во время (Date сдвинул бы день по часовому поясу). */
function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

const cardClass = 'rounded-3xl border border-line bg-surface p-6'

/** B2. Профиль: GET /users/me, PATCH /users/me, смена пароля через POST /auth/forgot-password, выход. */
export default function ProfilePage() {
  const { data: me, isLoading, isError, error } = useMe()
  if (isLoading) return <Loading />
  if (isError || !me) return <p className="p-6 text-danger">{errorMessage(error)}</p>

  return (
    <section className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-fg">Профиль</h1>
      <ProfileForm me={me} />
      <VerificationCard status={me.verificationStatus} />
      <AccountCard email={me.email} />
    </section>
  )
}

function ProfileForm({ me }: { me: User }) {
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: me.firstName, lastName: me.lastName, phone: me.phone },
  })

  async function onSubmit(values: FormValues) {
    try {
      const updated = await profileApi.updateMe(values)
      qc.setQueryData(['me'], updated)
      reset({ firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone })
      toast.success('Данные сохранены.')
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [name, message] of Object.entries(e.fields ?? {})) {
          if (name in values) setError(name as keyof FormValues, { message })
        }
      }
      toast.error(errorMessage(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={`${cardClass} space-y-4`}>
      <h2 className="text-base font-semibold text-fg">Личные данные</h2>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField label="Имя" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <TextField label="Фамилия" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <TextField label="Телефон" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField label="Email" value={me.email} readOnly disabled hint="Email изменить нельзя." />
        <TextField label="Дата рождения" value={formatIsoDate(me.birthDate)} readOnly disabled hint="Дату рождения изменить нельзя." />
      </div>
      <div className="pt-1 sm:max-w-xs">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          {isSubmitting ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}

function VerificationCard({ status }: { status: VerificationStatus }) {
  const hint: Record<VerificationStatus, string> = {
    unverified: 'Чтобы бронировать машины, подтвердите водительское удостоверение.',
    pending: 'Заявка отправлена и ожидает проверки администратором.',
    verified: 'Водительское удостоверение подтверждено. Доступны бронирование и тест ПДД.',
  }
  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Водительское удостоверение</h2>
          <p className="mt-1 text-sm text-muted">{hint[status]}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      {status !== 'verified' && (
        <Link to="/app/license" className="mt-4 inline-block text-sm font-medium text-fg underline hover:opacity-80">
          {status === 'pending' ? 'Посмотреть статус' : 'Подтвердить ВУ'}
        </Link>
      )}
    </div>
  )
}

function AccountCard({ email }: { email: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const clearToken = useAuthStore((s) => s.clear)
  const [sending, setSending] = useState(false)

  async function changePassword() {
    setSending(true)
    try {
      await authApi.forgotPassword(email)
      toast.success(`Запрос отправлен. Ссылка для смены пароля придёт на ${email} и действует 1 час.`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  function logout() {
    clearToken()
    qc.clear() // чтобы данные этого пользователя не показались следующему
    navigate('/cars', { replace: true })
  }

  return (
    <div className={`${cardClass} space-y-4`}>
      <h2 className="text-base font-semibold text-fg">Аккаунт</h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={changePassword}
          disabled={sending}
          className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {sending ? 'Отправляем…' : 'Сменить пароль'}
        </button>
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          Выйти
        </button>
      </div>
      <p className="text-xs text-muted">Сброс пароля завершит все ваши сессии на других устройствах.</p>
    </div>
  )
}
