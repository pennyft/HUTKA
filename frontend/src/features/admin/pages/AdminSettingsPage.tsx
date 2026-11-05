import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useSaveSettings, useSettings } from '../settings/hooks'
import { buildSettingsBody, isEmptyBody, settingsProblems, toValues, type SettingsValues } from '../settings/logic'

/**
 * AD19. Настройки платформы: комиссия (0–100 %), порог рейтинга (1–5) и минимальное число оценок (не меньше 1): ниже порога при достаточном
 * числе оценок бронирование арендатору недоступно. GET и PATCH /admin/settings. Процент комиссии хранится в каждой записи комиссии, поэтому
 * смена значения не меняет уже начисленное. Управления городами и лимитами в API нет.
 */
export default function AdminSettingsPage() {
  const { data, isPending, isError, error, refetch } = useSettings()
  const save = useSaveSettings()
  const [v, setV] = useState<SettingsValues | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsValues, string>>>({})
  const [note, setNote] = useState<string | null>(null)

  // форма подставляется из ответа сервера один раз и после каждого сохранения
  useEffect(() => {
    if (data) setV(toValues(data))
  }, [data])

  if (isPending) return <div className="mx-auto max-w-xl px-4 pt-6"><Skeleton className="h-72 rounded-3xl" aria-hidden /></div>
  if (isError || !v) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h1 className="text-lg font-bold text-fg">Не удалось загрузить настройки</h1>
          <p className="mt-1 text-sm text-muted">{isError ? errorMessage(error) : ''}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const body = (() => {
    const problems = settingsProblems(v)
    return Object.keys(problems).length === 0 ? buildSettingsBody(data, v) : null
  })()
  const dirty = body === null || !isEmptyBody(body)
  const set = (patch: Partial<SettingsValues>) => {
    setV({ ...v, ...patch })
    setErrors({})
    setNote(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const problems = settingsProblems(v!)
    setErrors(problems)
    if (Object.keys(problems).length > 0) return
    const b = buildSettingsBody(data!, v!)
    if (isEmptyBody(b)) {
      setNote('Вы ничего не изменили.')
      return
    }
    save.mutate(b)
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pb-10 pt-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Настройки платформы</h1>
        {data.updatedAt && (
          <p className="mt-1 text-sm text-muted">
            Изменено {formatDateTime(data.updatedAt)}
            {data.updatedByAdminId && <> администратором {data.updatedByAdminId.slice(0, 8)}</>}
          </p>
        )}
      </header>

      <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl border border-line bg-surface p-5">
        <TextField
          label="Комиссия платформы, %"
          inputMode="decimal"
          value={v.commissionPercent}
          onChange={(e) => set({ commissionPercent: e.target.value })}
          error={errors.commissionPercent}
          hint="От 0 до 100. Процент хранится в каждой записи комиссии: уже начисленное не пересчитывается."
        />
        <TextField
          label="Порог рейтинга арендатора"
          inputMode="decimal"
          value={v.minRatingThreshold}
          onChange={(e) => set({ minRatingThreshold: e.target.value })}
          error={errors.minRatingThreshold}
          hint="От 1 до 5. Арендатору с рейтингом ниже порога бронирование недоступно."
        />
        <TextField
          label="Минимум оценок для применения порога"
          inputMode="numeric"
          value={v.minRatingsCount}
          onChange={(e) => set({ minRatingsCount: e.target.value })}
          error={errors.minRatingsCount}
          hint="Целое число не меньше 1. Пока оценок меньше, порог не действует."
        />
        {(save.isError || note) && (
          <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
            {save.isError ? errorMessage(save.error) : note}
          </p>
        )}
        <Button type="submit" variant="dark" loading={save.isPending} disabled={!dirty}>
          Сохранить
        </Button>
      </form>
    </div>
  )
}
