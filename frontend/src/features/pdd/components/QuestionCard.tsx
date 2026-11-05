import type { PddQuestion } from '../types'

interface Props {
  question: PddQuestion
  index: number
  total: number
  selected: number | undefined
  disabled: boolean
  onSelect: (answerIndex: number) => void
}

/** Один вопрос. Варианты это настоящие radio (клавиатура и скринридер работают из коробки), визуально скрытые под карточкой. */
export function QuestionCard({ question, index, total, selected, disabled, onSelect }: Props) {
  return (
    <fieldset disabled={disabled} className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <legend className="sr-only">
        Вопрос {index + 1} из {total}
      </legend>
      <p className="text-xs text-muted">
        Вопрос {index + 1} из {total}
      </p>
      <p className="mt-1 text-lg font-bold text-fg">{question.text}</p>
      <div className="mt-4 space-y-2">
        {question.variants.map((v, i) => (
          <label key={i} className="block cursor-pointer">
            <input type="radio" name={`q-${question.id}`} checked={selected === i} onChange={() => onSelect(i)} className="peer sr-only" />
            <span className="flex gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-fg transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-disabled:opacity-60">
              <span aria-hidden className="shrink-0 font-semibold text-muted">
                {i + 1}.
              </span>
              <span>{v}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
