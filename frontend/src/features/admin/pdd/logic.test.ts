import { describe, expect, it } from 'vitest'
import { activeWarning, buildCreateBody, buildUpdateBody, emptyForm, formFromQuestion, indexAfterRemove, questionProblem } from './logic'
import type { PddForm, PddQuestion } from './types'

const ok = (over: Partial<PddForm> = {}): PddForm => ({ text: 'Что означает знак?', variants: ['Стоп', 'Уступи', 'Парковка'], correctIndex: 1, category: 'знаки', active: true, ...over })
const q: PddQuestion = { id: 'q1', text: 'Что означает знак?', variants: ['Стоп', 'Уступи', 'Парковка'], correctIndex: 1, category: 'знаки', active: true, source: 'admin', createdAt: 'x' }

describe('проверка вопроса как на сервере', () => {
  it('верный проходит', () => {
    expect(questionProblem(ok())).toBeNull()
  })
  it('текст, варианты, повторы, индекс, категория', () => {
    expect(questionProblem(ok({ text: '  ' }))).toMatch(/Текст вопроса/)
    expect(questionProblem(ok({ variants: ['один'], correctIndex: 0 }))).toMatch(/от 2 до 10/)
    expect(questionProblem(ok({ variants: Array.from({ length: 11 }, (_, i) => `в${i}`) }))).toMatch(/от 2 до 10/)
    expect(questionProblem(ok({ variants: ['Стоп', ' '], correctIndex: 0 }))).toMatch(/пустым/)
    expect(questionProblem(ok({ variants: ['Стоп', ' Стоп '], correctIndex: 0 }))).toMatch(/повторяться/)
    expect(questionProblem(ok({ correctIndex: 5 }))).toMatch(/верный/)
    expect(questionProblem(ok({ correctIndex: -1 }))).toMatch(/верный/)
    expect(questionProblem(ok({ category: 'к'.repeat(31) }))).toMatch(/30/)
  })
  it('форма по умолчанию: четыре пустых варианта, активен', () => {
    expect(emptyForm().variants).toHaveLength(4)
    expect(emptyForm().active).toBe(true)
    expect(questionProblem(emptyForm())).toMatch(/Текст/)
  })
})

describe('тела запросов', () => {
  it('создание: тексты обрезаются, пустая категория не передаётся', () => {
    expect(buildCreateBody(ok({ text: ' Текст ', variants: [' а ', 'б'], correctIndex: 0, category: '  ' }))).toEqual({ text: 'Текст', variants: ['а', 'б'], correctIndex: 0, active: true })
    expect(buildCreateBody(ok()).category).toBe('знаки')
  })
  it('правка: только изменённое, варианты уходят вместе с индексом', () => {
    expect(buildUpdateBody(q, formFromQuestion(q))).toEqual({})
    expect(buildUpdateBody(q, ok({ active: false }))).toEqual({ active: false })
    expect(buildUpdateBody(q, ok({ text: 'Новый текст' }))).toEqual({ text: 'Новый текст' })
    expect(buildUpdateBody(q, ok({ correctIndex: 0 }))).toEqual({ variants: ['Стоп', 'Уступи', 'Парковка'], correctIndex: 0 })
    expect(buildUpdateBody(q, ok({ variants: ['Стоп', 'Уступи', 'Парковка', 'Другое'] }))).toEqual({ variants: ['Стоп', 'Уступи', 'Парковка', 'Другое'], correctIndex: 1 })
  })
})

describe('удаление варианта и предупреждение', () => {
  it('верный индекс остаётся на том же ответе', () => {
    expect(indexAfterRemove(2, 0)).toBe(1)
    expect(indexAfterRemove(1, 2)).toBe(1)
    expect(indexAfterRemove(2, 2)).toBe(1)
    expect(indexAfterRemove(0, 0)).toBe(0)
  })
  it('мало активных вопросов', () => {
    expect(activeWarning(undefined)).toBeNull()
    expect(activeWarning(10)).toBeNull()
    expect(activeWarning(3)).toMatch(/3 из 10/)
  })
})
