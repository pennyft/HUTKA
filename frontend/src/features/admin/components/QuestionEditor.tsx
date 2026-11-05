import { useState } from 'react'
import { errorMessage } from '@/api/errors'
import { TextAreaField } from '@/features/support/components/FormFields'
import { Button } from '@/shared/ui/Button'
import { Checkbox, TextField } from '@/shared/ui/fields'
import { CATEGORY_MAX, indexAfterRemove, MAX_VARIANTS, MIN_VARIANTS, questionProblem, TEXT_MAX } from '../pdd/logic'
import type { PddForm } from '../pdd/types'

interface Props {
  initial: PddForm
  title: string
  submitLabel: string
  loading: boolean
  /** Ошибка сервера (400 с текстом) под формой. */
  error?: unknown
  onSubmit: (f: PddForm) => void
  onCancel: () => void
}

/** Редактор вопроса: текст, от 2 до 10 вариантов с отметкой верного, категория, признак «активен». Проверки те же, что на сервере. */
export function QuestionEditor({ initial, title, submitLabel, loading, error, onSubmit, onCancel }: Props) {
  const [f, setF] = useState<PddForm>(initial)
  const [problem, setProblem] = useState<string | null>(null)
  const set = (patch: Partial<PddForm>) => {
    setF((prev) => ({ ...prev, ...patch }))
    setProblem(null)
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const p = questionProblem(f)
        setProblem(p)
        if (!p) onSubmit(f)
      }}
      className="space-y-4 rounded-3xl border border-primary bg-surface p-5"
    >
      <h2 className="font-bold text-fg">{title}</h2>
      <TextAreaField label="Текст вопроса" rows={3} maxLength={TEXT_MAX} value={f.text} onChange={(e) => set({ text: e.target.value })} />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-fg">Варианты ответа (отметьте верный)</legend>
        <div className="space-y-2">
          {f.variants.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={f.correctIndex === i} onChange={() => set({ correctIndex: i })} aria-label={`Верный вариант: ${i + 1}`} className="size-4 shrink-0 accent-primary" />
              <input
                type="text"
                value={v}
                aria-label={`Вариант ${i + 1}`}
                onChange={(e) => set({ variants: f.variants.map((x, j) => (j === i ? e.target.value : x)) })}
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                disabled={f.variants.length <= MIN_VARIANTS}
                onClick={() => set({ variants: f.variants.filter((_, j) => j !== i), correctIndex: indexAfterRemove(f.correctIndex, i) })}
                aria-label={`Удалить вариант ${i + 1}`}
                className="rounded-full px-2 py-1 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {f.variants.length < MAX_VARIANTS && (
          <button type="button" onClick={() => set({ variants: [...f.variants, ''] })} className="mt-2 text-sm font-medium text-fg underline hover:opacity-80">
            Добавить вариант
          </button>
        )}
      </fieldset>

      <TextField label="Категория (необязательно)" maxLength={CATEGORY_MAX} value={f.category} onChange={(e) => set({ category: e.target.value })} />
      <Checkbox checked={f.active} onChange={(e) => set({ active: e.target.checked })}>
        Активен: вопрос попадает в тест
      </Checkbox>

      {(problem || error !== undefined) && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
          {problem ?? errorMessage(error)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <Button type="submit" variant="dark" loading={loading}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
