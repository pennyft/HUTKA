import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '../api'
import { useMe } from '@/features/auth/hooks'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Loading } from '@/shared/ui/Loading'
import { TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'
import { todayIso } from '@/shared/lib/date'

const cardClass = 'rounded-3xl border border-line bg-surface p-6'

/**
 * B3. Верификация ВУ. Состояние берётся из verificationStatus профиля:
 * unverified → форма (и причина последнего отклонения, если была), pending → ожидание, verified → готово.
 * Статус меняется администратором; страница обновляется по уведомлению (SocketBridge перечитывает профиль)
 * и при возврате на вкладку.
 */
export default function LicensePage() {
  const { data: me, isLoading, isError, error } = useMe()
  // Пользователя привели сюда из закрытого раздела (меню или RequireVerified): объясняем, почему
  const needVerification = (useLocation().state as { needVerification?: boolean } | null)?.needVerification
  if (isLoading) return <Loading />
  if (isError || !me) return <p className="p-6 text-danger">{errorMessage(error)}</p>

  return (
    <section className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-fg">Водительское удостоверение</h1>
      {needVerification && me.verificationStatus !== 'verified' && (
        <p className="rounded-xl border border-line bg-surface-2 p-3.5 text-sm text-fg">
          Этот раздел откроется после подтверждения водительского удостоверения.
        </p>
      )}
      {me.verificationStatus === 'unverified' && <LicenseForm birthDate={me.birthDate} />}
      {me.verificationStatus === 'pending' && <Pending />}
      {me.verificationStatus === 'verified' && <Verified />}
    </section>
  )
}

function LicenseForm({ birthDate }: { birthDate: string }) {
  const qc = useQueryClient()
  // Причина отклонения нужна только тем, кого уже отклоняли; ошибка загрузки не должна ломать форму
  const { data: reason } = useQuery({
    queryKey: ['notifications', 'license-rejection'],
    queryFn: profileApi.lastLicenseRejectionReason,
    retry: false,
  })

  // Лимиты из auth/dto/LicenseRequest.java: номер обязателен и ≤32, дата не в будущем.
  // Формат номера бэк не проверяет, поэтому здесь тоже не проверяется. Дата выдачи не раньше даты рождения (400 на бэке).
  const schema = z.object({
    licenseNumber: z.string().trim().min(1, 'Обязательное поле').max(32, 'Не больше 32 символов'),
    licenseIssueDate: z
      .string()
      .min(1, 'Обязательное поле')
      .refine((v) => v <= todayIso(), 'Дата выдачи не может быть в будущем')
      .refine((v) => v >= birthDate, 'Дата выдачи не может быть раньше даты рождения'),
  })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      await profileApi.submitLicense(values)
      await qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Заявка отправлена на проверку.')
    } catch (e) {
      if (e instanceof ApiError) {
        for (const [name, message] of Object.entries(e.fields ?? {})) {
          if (name in values) setError(name as keyof FormValues, { message })
        }
        // 409 «Водительское удостоверение уже подтверждено»: профиль устарел, перечитываем
        if (e.status === 409) await qc.invalidateQueries({ queryKey: ['me'] })
      }
      toast.error(errorMessage(e))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={`${cardClass} space-y-4`}>
      {reason ? (
        <div className="rounded-xl border border-danger/40 bg-surface-2 p-3.5 text-sm text-fg">
          <p className="font-medium text-danger">Предыдущая заявка отклонена</p>
          <p className="mt-1">Причина: {reason}</p>
          <p className="mt-1 text-muted">Исправьте данные и отправьте заявку ещё раз.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">Бронирование, тест ПДД и групповые поездки доступны после подтверждения ВУ администратором.</p>
      )}
      <TextField label="Номер ВУ" autoComplete="off" error={errors.licenseNumber?.message} {...register('licenseNumber')} />
      <TextField label="Дата выдачи" type="date" max={todayIso()} min={birthDate} error={errors.licenseIssueDate?.message} {...register('licenseIssueDate')} />
      <div className="pt-1">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? 'Отправляем…' : 'Отправить на проверку'}
        </Button>
      </div>
    </form>
  )
}

function Pending() {
  return (
    <div className={cardClass}>
      <span className="inline-block rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-fg">На проверке</span>
      <h2 className="mt-3 text-xl font-bold tracking-tight text-fg">Заявка отправлена</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Мы проверим данные и сообщим о результате уведомлением. Пока идёт проверка, можно смотреть каталог.
      </p>
      <Link to="/cars" className="mt-5 inline-block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
        Перейти в каталог
      </Link>
    </div>
  )
}

function Verified() {
  return (
    <div className={cardClass}>
      <span className="inline-block rounded-full border border-primary bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">Подтверждено</span>
      <h2 className="mt-3 text-xl font-bold tracking-tight text-fg">Водительское удостоверение подтверждено</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">Теперь можно бронировать машины, проходить тест ПДД и участвовать в групповых поездках.</p>
      <Link to="/cars" className="mt-5 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover">
        Выбрать машину
      </Link>
    </div>
  )
}
