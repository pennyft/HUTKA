import { z } from 'zod'
import { CATEGORY_ORDER } from './labels'
import type { TicketCategory } from './types'

/** Пределы из TicketRules.java: тема до 200, текст до 4000 символов. */
export const SUBJECT_MAX = 200
export const TEXT_MAX = 4000

export const ticketSchema = z.object({
  // пустая строка = категория не выбрана
  category: z.string().refine((v) => (CATEGORY_ORDER as string[]).includes(v), 'Выберите категорию'),
  subject: z.string().trim().min(1, 'Введите тему').max(SUBJECT_MAX, `Не больше ${SUBJECT_MAX} символов`),
  description: z.string().trim().min(1, 'Опишите проблему').max(TEXT_MAX, `Не больше ${TEXT_MAX} символов`),
  urgent: z.boolean(),
})
export type TicketFormValues = z.infer<typeof ticketSchema>

export const asCategory = (v: string): TicketCategory => v as TicketCategory
