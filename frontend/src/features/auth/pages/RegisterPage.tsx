import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router'
import { authApi } from '../api'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Checkbox, PasswordField, TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'
import { getAge, todayIso } from '@/shared/lib/date'

/**
 * Правила полей: лимиты из auth/dto/RegisterRequest.java бэка (имя/фамилия ≤100, email ≤254, телефон ≤30,
 * пароль 8–72, дата рождения в прошлом, возраст от 18). Правило «телефон начинается с +375» взято из макета,
 * бэк его не проверяет. Чекбокс согласия существует только на фронте: в API такого поля нет.
 */
const schema = z.object({
  firstName: z.string().trim().min(1, 'Обязательное поле').max(100, 'Не больше 100 символов'),
  lastName: z.string().trim().min(1, 'Обязательное поле').max(100, 'Не больше 100 символов'),
  email: z.string().trim().min(1, 'Обязательное поле').max(254, 'Не больше 254 символов').email('Введите корректный email'),
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
  birthDate: z
    .string()
    .min(1, 'Обязательное поле')
    .refine((v) => getAge(v) >= 18, 'Вам должно быть не меньше 18 лет'),
  password: z.string().min(1, 'Обязательное поле').min(8, 'Пароль должен быть от 8 до 72 символов').max(72, 'Пароль должен быть от 8 до 72 символов'),
  terms: z.boolean().refine((v) => v, 'Необходимо принять условия'),
})
type FormValues = z.infer<typeof schema>

/** A2. Регистрация → POST /auth/register (200 без тела) → экран A3 с введённым email. */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [maxBirthDate] = useState(() => todayIso())
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { terms: false } })

  async function onSubmit({ terms: _terms, ...values }: FormValues) {
    try {
      await authApi.register(values)
      navigate('/verify-email', { state: { email: values.email } })
    } catch (e) {
      if (e instanceof ApiError) {
        // Ошибки по полям, если бэк прислал fields: {имя поля: сообщение}
        for (const [name, message] of Object.entries(e.fields ?? {})) {
          if (name in values) setError(name as keyof FormValues, { message })
        }
        // 409 «Email уже зарегистрирован»
        if (e.status === 409) setError('email', { message: e.message })
      }
      // 400 (возраст), 409 и 503 (письмо не отправилось): текст русский, показываем как есть
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Создать аккаунт</h1>
        <p className="mt-1 text-sm text-muted">Введите данные, чтобы присоединиться к HUTKA.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <TextField label="Имя" placeholder="Введите имя" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <TextField label="Фамилия" placeholder="Введите фамилию" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <TextField label="Email" type="email" placeholder="name@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Телефон" type="tel" placeholder="+375 XX XXX-XX-XX" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <TextField label="Дата рождения" type="date" max={maxBirthDate} autoComplete="bday" error={errors.birthDate?.message} {...register('birthDate')} />
        <PasswordField
          label="Пароль"
          placeholder="Введите пароль"
          autoComplete="new-password"
          hint="Пароль должен быть от 8 до 72 символов."
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="pt-1">
          <Checkbox error={errors.terms?.message} {...register('terms')}>
            Я принимаю{' '}
            {/* TODO: страницы условий и политики пока не существуют */}
            <a href="#" className="font-medium text-fg underline hover:opacity-80">
              Условия использования
            </a>{' '}
            и{' '}
            <a href="#" className="font-medium text-fg underline hover:opacity-80">
              Политику конфиденциальности
            </a>
            .
          </Checkbox>
        </div>
        <div className="pt-2">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Создаём аккаунт…' : 'Создать аккаунт'}
          </Button>
        </div>
        <p className="pt-2 text-center text-sm text-muted">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-fg underline hover:opacity-80">
            Войти
          </Link>
        </p>
      </form>
    </>
  )
}
