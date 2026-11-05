import type { CreatePddBody, PddForm, PddQuestion, UpdatePddBody } from './types'

/** Пределы бэка (AdminPddQuestionService): вариантов от 2 до 10, текст до 2000, категория до 30. */
export const MIN_VARIANTS = 2
export const MAX_VARIANTS = 10
export const TEXT_MAX = 2000
export const CATEGORY_MAX = 30
/** В одной попытке теста 10 вопросов (PddRules): активных меньше десяти значит тест недоступен пользователям. */
export const MIN_ACTIVE = 10

export const emptyForm = (): PddForm => ({ text: '', variants: ['', '', '', ''], correctIndex: 0, category: '', active: true })

export const formFromQuestion = (q: PddQuestion): PddForm => ({ text: q.text, variants: [...q.variants], correctIndex: q.correctIndex, category: q.category ?? '', active: q.active })

/** Первая проблема в вопросе, как проверит сервер. null значит можно отправлять. */
export function questionProblem(f: PddForm): string | null {
  if (!f.text.trim()) return 'Текст вопроса не может быть пустым'
  if (f.text.trim().length > TEXT_MAX) return `Текст вопроса: не больше ${TEXT_MAX} символов`
  const variants = f.variants.map((v) => v.trim())
  if (variants.length < MIN_VARIANTS || variants.length > MAX_VARIANTS) return `Вариантов ответа должно быть от ${MIN_VARIANTS} до ${MAX_VARIANTS}`
  if (variants.some((v) => v === '')) return 'Вариант ответа не может быть пустым'
  if (new Set(variants).size !== variants.length) return 'Варианты ответа не должны повторяться'
  if (f.correctIndex < 0 || f.correctIndex >= variants.length) return 'Отметьте верный вариант ответа'
  if (f.category.trim().length > CATEGORY_MAX) return `Категория: не больше ${CATEGORY_MAX} символов`
  return null
}

export function buildCreateBody(f: PddForm): CreatePddBody {
  const category = f.category.trim()
  return { text: f.text.trim(), variants: f.variants.map((v) => v.trim()), correctIndex: f.correctIndex, ...(category ? { category } : {}), active: f.active }
}

/**
 * Тело PATCH только из изменённого. Варианты и верный индекс уходят вместе (сервер проверяет итоговую пару). Пустая категория
 * не отправляется: сервер при пустой строке сохранит null, но «не передано» надёжнее для неизменённого поля.
 */
export function buildUpdateBody(orig: PddQuestion, f: PddForm): UpdatePddBody {
  const body: UpdatePddBody = {}
  const variants = f.variants.map((v) => v.trim())
  if (f.text.trim() !== orig.text) body.text = f.text.trim()
  if (variants.length !== orig.variants.length || variants.some((v, i) => v !== orig.variants[i]) || f.correctIndex !== orig.correctIndex) {
    body.variants = variants
    body.correctIndex = f.correctIndex
  }
  if (f.category.trim() !== (orig.category ?? '')) body.category = f.category.trim()
  if (f.active !== orig.active) body.active = f.active
  return body
}

/** После удаления варианта верный индекс сдвигается так, чтобы указывать на тот же ответ (или на ближайший, если удалён сам верный). */
export function indexAfterRemove(correct: number, removed: number): number {
  if (removed < correct) return correct - 1
  if (removed === correct) return Math.max(0, correct - 1)
  return correct
}

/** Сообщение о нехватке активных вопросов. null, если хватает. */
export function activeWarning(active: number | undefined): string | null {
  if (active === undefined || active >= MIN_ACTIVE) return null
  return `Активных вопросов ${active} из ${MIN_ACTIVE} необходимых: пока их меньше ${MIN_ACTIVE}, тест ПДД у пользователей недоступен.`
}
