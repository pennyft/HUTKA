import { describe, expect, it } from 'vitest'
import { TONE_STYLES, WEATHER_HAZARD, WEATHER_TEXT, describeWeather } from './weather'

function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('describeWeather', () => {
  it.each([
    [0, 'Ясно', 'clear'],
    [1, 'Малооблачно', 'clear'],
    [2, 'Переменная облачность', 'cloudy'],
    [3, 'Пасмурно', 'cloudy'],
    [45, 'Туман', 'fog'],
    [53, 'Морось', 'rain'],
    [63, 'Дождь', 'rain'],
    [67, 'Ледяной дождь', 'rain'],
    [73, 'Снег', 'snow'],
    [77, 'Снежная крупа', 'snow'],
    [81, 'Ливни', 'rain'],
    [86, 'Снегопад', 'snow'],
    [95, 'Гроза', 'storm'],
    [99, 'Гроза с градом', 'storm'],
  ])('код %i: %s', (code, label, tone) => {
    const w = describeWeather(code)
    expect(w.label).toBe(label)
    expect(w.tone).toBe(tone)
  })
  it('неизвестный код не ломает', () => {
    expect(describeWeather(1234).label).toBe('Погода')
  })
})

describe('контраст текста на плитках', () => {
  for (const [tone, s] of Object.entries(TONE_STYLES)) {
    it(`${tone}: основной, второстепенный и красный текст не ниже 4,5:1`, () => {
      expect(contrast(WEATHER_TEXT, s.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(s.secondary, s.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(WEATHER_HAZARD, s.bg)).toBeGreaterThanOrEqual(4.5)
    })
  }
})
