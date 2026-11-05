import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { PasswordField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'

/**
 * Лимиты: на бэке для newPassword только минимум 8 (auth/dto/ResetPasswordRequest.java), максимума нет.
 * Верхняя граница 72 взята из регистрации, чтобы правила пароля были одинаковыми. Поле «повторите пароль»
 * существует только на фронте.
 */
const schema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Обязательное поле')
      .min(8, 'Пароль должен быть от 8 до 72 символов')
      .max(72, 'Пароль должен быть от 8 до 72 символов'),
    confirm: z.string().min(1, 'Повторите пароль'),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Пароли не совпадают' })
type FormValues = z.infer<typeof schema>

/**
 * A6. Новый пароль по ссылке из письма (/reset-password?token=...) → POST /auth/reset-password {token, newPassword}.
 * 400 «Ссылка недействительна или истёк срок действия» → предлагаем запросить новую.
 * После успеха бэк гасит все сессии пользователя, поэтому локальный токен сбрасываем и ведём на вход.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const clearToken = useAuthStore((s) => s.clear)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (!token) {
    return <InvalidLink text="В ссылке нет токена. Откройте ссылку из письма целиком или запросите новую." />
  }

  async function onSubmit({ newPassword }: FormValues) {
    try {
      await authApi.resetPassword({ token, newPassword })
      clearToken()
      toast.success('Пароль изменён. Войдите с новым паролем.')
      navigate('/login', { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && !e.fields) {
        setError('root', { message: e.message })
        return
      }
      if (e instanceof ApiError && e.fields?.newPassword) {
        setError('newPassword', { message: e.fields.newPassword })
        return
      }
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Новый пароль</h1>
        <p className="mt-1 text-sm text-muted">Придумайте пароль, которого не было на других сайтах.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PasswordField
          label="Новый пароль"
          placeholder="Введите новый пароль"
          autoComplete="new-password"
          hint="Пароль должен быть от 8 до 72 символов."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField label="Повторите пароль" placeholder="Повторите пароль" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        {errors.root && (
          <p className="text-sm text-danger">
            {errors.root.message}{' '}
            <Link to="/forgot-password" className="font-medium underline hover:opacity-80">
              Запросить новую ссылку
            </Link>
          </p>
        )}
        <div className="pt-2">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Сохраняем…' : 'Сохранить пароль'}
          </Button>
        </div>
      </form>
    </>
  )
}

function InvalidLink({ text }: { text: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-fg">Ссылка недействительна</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      <div className="mt-6">
        <Link
          to="/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Запросить новую ссылку
        </Link>
      </div>
    </div>
  )
}
