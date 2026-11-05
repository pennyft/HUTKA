import { describe, expect, it } from 'vitest'
import { createLimiter, fitSize, STORAGE_UNREACHABLE, uploadFailureMessage, validateInputFile } from './logic'

describe('размер после сжатия', () => {
  it('длинная сторона не больше предела, пропорции сохраняются', () => {
    expect(fitSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })
  it('маленькое фото не увеличиваем', () => {
    expect(fitSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
  it('мусорные размеры', () => {
    expect(fitSize(0, 100, 1600)).toEqual({ width: 0, height: 0 })
    expect(fitSize(NaN, 100, 1600)).toEqual({ width: 0, height: 0 })
  })
})

describe('проверка файла и ошибки', () => {
  it('только изображения до 20 МБ', () => {
    expect(validateInputFile({ type: 'image/jpeg', size: 1_000_000 })).toBeNull()
    expect(validateInputFile({ type: 'application/pdf', size: 1000 })).toMatch(/изображение/)
    expect(validateInputFile({ type: 'image/png', size: 21 * 1024 * 1024 })).toMatch(/20 МБ/)
  })
  it('тексты по статусам хранилища (PUT в R2)', () => {
    expect(uploadFailureMessage(403)).toMatch(/недействительна или истекла/)
    expect(uploadFailureMessage(404)).toMatch(/Бакет/)
    expect(uploadFailureMessage(413)).toMatch(/большой/)
    expect(uploadFailureMessage(500)).toContain('500')
  })
  it('сообщение о недоступном хранилище упоминает CORS', () => {
    expect(STORAGE_UNREACHABLE).toMatch(/CORS/)
  })
})

describe('ограничитель параллельности', () => {
  it('не больше n задач одновременно, результаты сохраняются', async () => {
    const limit = createLimiter(2)
    let active = 0
    let peak = 0
    const task = (v: number) => async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return v
    }
    const results = await Promise.all([1, 2, 3, 4, 5].map((v) => limit(task(v))))
    expect(results).toEqual([1, 2, 3, 4, 5])
    expect(peak).toBe(2)
  })
  it('ошибка одной задачи не блокирует остальные', async () => {
    const limit = createLimiter(1)
    const bad = limit(() => Promise.reject(new Error('x')))
    const good = limit(() => Promise.resolve('ok'))
    await expect(bad).rejects.toThrow('x')
    await expect(good).resolves.toBe('ok')
  })
})
