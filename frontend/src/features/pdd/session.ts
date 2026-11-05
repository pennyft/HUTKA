import { create } from 'zustand'
import type { PddQuestion, PddSession } from './types'
import { sanitizeAnswers } from './logic'

interface SessionState {
  session: PddSession | null
  set: (s: PddSession) => void
  clear: () => void
}

/**
 * Идущая попытка в памяти. Её кладёт сюда кнопка «Начать» / «Продолжить» после GET /pddtest/questions.
 * Страница теста сама запрос не делает: при обновлении страницы сессии нет и пользователь возвращается на главную,
 * где попытка отображается как «Продолжить» (повторный GET вернёт ту же попытку и не потратит новую).
 */
export const usePddSessionStore = create<SessionState>((set) => ({
  session: null,
  set: (session) => set({ session }),
  clear: () => set({ session: null }),
}))

const key = (attemptId: string) => `pdd:answers:${attemptId}`

/** Ответы сохраняются в sessionStorage, чтобы обновление страницы не сбрасывало выбранное. Доступ к хранилищу может быть закрыт. */
export function loadAnswers(attemptId: string, questions: PddQuestion[]): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(key(attemptId))
    return raw ? sanitizeAnswers(questions, JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveAnswers(attemptId: string, answers: Record<string, number>): void {
  try {
    sessionStorage.setItem(key(attemptId), JSON.stringify(answers))
  } catch {
    // хранилище недоступно или переполнено: ответы живут только в памяти
  }
}

export function clearAnswers(attemptId: string): void {
  try {
    sessionStorage.removeItem(key(attemptId))
  } catch {
    // ничего
  }
}
