import { http } from '@/api/http'
import type { PddAnswer, PddHistory, PddResult, PddSession } from './types'

export const pddApi = {
  /** GET /pddtest/attempts: цикл, активная скидка и история попыток. 403, если ВУ не подтверждено. */
  history: (signal?: AbortSignal) => http.request<PddHistory>('/pddtest/attempts', { signal }),

  /**
   * GET /pddtest/questions. ВАЖНО: это не чтение, а старт: если идущей попытки нет, бэк создаёт новую и тратит попытку цикла.
   * Вызывать только по нажатию кнопки. Если попытка уже идёт, вернётся она же (повторный вызов безопасен).
   * 409: попытки цикла закончились (в тексте дата), в базе меньше 10 активных вопросов.
   */
  start: () => http.request<PddSession>('/pddtest/questions'),

  /**
   * POST /pddtest/attempts. Ответов может быть меньше десяти: неотвеченные считаются ошибками.
   * 409: время вышло (даётся ещё 15 секунд после expiresAt) или ответы уже приняты. 400: дубль, чужой вопрос, неверный индекс.
   */
  submit: (body: { attemptId: string; answers: PddAnswer[] }) => http.request<PddResult>('/pddtest/attempts', { method: 'POST', body }),
}
