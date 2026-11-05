import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from 'lucide-react'
import type { WeatherHazard } from '@/features/bookings/types'

export type WeatherTone = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'

export interface WeatherInfo {
  label: string
  tone: WeatherTone
  icon: LucideIcon
}

/**
 * Код погоды Open-Meteo (WMO, таблица 4677) → название, цветовая группа и иконка.
 * Группы по таблице WMO: 0–3 небо, 45/48 туман, 51–57 морось, 61–67 дождь, 71–77 снег, 80–82 ливни,
 * 85–86 снегопады, 95–99 гроза. Неизвестный код показываем нейтрально, а не прячем.
 */
export function describeWeather(code: number): WeatherInfo {
  if (code === 0) return { label: 'Ясно', tone: 'clear', icon: Sun }
  if (code === 1) return { label: 'Малооблачно', tone: 'clear', icon: Sun }
  if (code === 2) return { label: 'Переменная облачность', tone: 'cloudy', icon: CloudSun }
  if (code === 3) return { label: 'Пасмурно', tone: 'cloudy', icon: Cloud }
  if (code === 45 || code === 48) return { label: 'Туман', tone: 'fog', icon: CloudFog }
  if (code >= 51 && code <= 55) return { label: 'Морось', tone: 'rain', icon: CloudDrizzle }
  if (code === 56 || code === 57) return { label: 'Ледяная морось', tone: 'rain', icon: CloudDrizzle }
  if (code >= 61 && code <= 65) return { label: 'Дождь', tone: 'rain', icon: CloudRain }
  if (code === 66 || code === 67) return { label: 'Ледяной дождь', tone: 'rain', icon: CloudRain }
  if (code >= 71 && code <= 75) return { label: 'Снег', tone: 'snow', icon: CloudSnow }
  if (code === 77) return { label: 'Снежная крупа', tone: 'snow', icon: CloudSnow }
  if (code >= 80 && code <= 82) return { label: 'Ливни', tone: 'rain', icon: CloudRain }
  if (code === 85 || code === 86) return { label: 'Снегопад', tone: 'snow', icon: CloudSnow }
  if (code === 95) return { label: 'Гроза', tone: 'storm', icon: CloudLightning }
  if (code === 96 || code === 99) return { label: 'Гроза с градом', tone: 'storm', icon: CloudLightning }
  return { label: 'Погода', tone: 'cloudy', icon: Cloud }
}

/**
 * Цвета плиток погоды. Это не цвета бренда, поэтому они живут здесь, а не в токенах темы.
 * text/secondary/hazard проверяются тестом на контраст не ниже 4,5:1 (weather.test.ts); icon декоративный
 * (рядом всегда есть подпись).
 */
export const TONE_STYLES: Record<WeatherTone, { bg: string; secondary: string; icon: string }> = {
  clear: { bg: '#FBEBB5', secondary: '#5A4A1A', icon: '#B7791F' },
  cloudy: { bg: '#E3E7EB', secondary: '#3F4A55', icon: '#5B6874' },
  rain: { bg: '#D6E4F2', secondary: '#34495E', icon: '#2F5F94' },
  snow: { bg: '#E1EEF5', secondary: '#3A5568', icon: '#4F86A6' },
  storm: { bg: '#DAD6EC', secondary: '#3B3764', icon: '#5B4FA3' },
  fog: { bg: '#E6E6E3', secondary: '#4A4A46', icon: '#6B6B66' },
}

export const WEATHER_TEXT = '#111111'
export const WEATHER_HAZARD = '#9B1C1C'

/** Явления из hazards в виде «ожидается …». */
export const HAZARD_PHRASE: Record<WeatherHazard, string> = {
  rain: 'дождь',
  ice: 'гололёд',
  fog: 'туман',
  strong_wind: 'сильный ветер',
  snow: 'снег',
  thunderstorm: 'гроза',
}
