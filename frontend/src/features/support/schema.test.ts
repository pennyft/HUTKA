import { describe, expect, it } from 'vitest'
import { SUBJECT_MAX, TEXT_MAX, ticketSchema } from './schema'

const ok = { category: 'booking', subject: 'Тема', description: 'Описание', urgent: false }
const messageOf = (v: unknown, field: string) => {
  const r = ticketSchema.safeParse(v)
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === field)?.message
}

describe('форма обращения', () => {
  it('корректные данные проходят', () => {
    expect(ticketSchema.safeParse(ok).success).toBe(true)
  })
  it('категория обязательна', () => {
    expect(messageOf({ ...ok, category: '' }, 'category')).toBe('Выберите категорию')
    expect(messageOf({ ...ok, category: 'system' }, 'category')).toBe('Выберите категорию')
  })
  it('пробелы вместо темы и описания не считаются', () => {
    expect(messageOf({ ...ok, subject: '   ' }, 'subject')).toBe('Введите тему')
    expect(messageOf({ ...ok, description: '  ' }, 'description')).toBe('Опишите проблему')
  })
  it('пределы как на бэке: тема 200, текст 4000', () => {
    expect(ticketSchema.safeParse({ ...ok, subject: 'a'.repeat(SUBJECT_MAX) }).success).toBe(true)
    expect(messageOf({ ...ok, subject: 'a'.repeat(SUBJECT_MAX + 1) }, 'subject')).toBe('Не больше 200 символов')
    expect(ticketSchema.safeParse({ ...ok, description: 'a'.repeat(TEXT_MAX) }).success).toBe(true)
    expect(messageOf({ ...ok, description: 'a'.repeat(TEXT_MAX + 1) }, 'description')).toBe('Не больше 4000 символов')
  })
})
