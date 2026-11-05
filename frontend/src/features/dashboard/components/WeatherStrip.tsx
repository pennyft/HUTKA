import type { LucideIcon } from 'lucide-react'
import { dayInZone, fmtTemp } from '../logic'
import type { DayForecast } from '../types'
import { HAZARD_PHRASE, TONE_STYLES, WEATHER_HAZARD, WEATHER_TEXT, describeWeather } from '../weather'

/** «чт» → «Чт»: день недели для даты прогноза (дата уже минская, поэтому считаем её в UTC без сдвигов). */
function weekday(date: string): string {
  const w = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
  return w.charAt(0).toUpperCase() + w.slice(1)
}

const temps = (d: DayForecast) => ({
  max: d.temperatureMaxC !== null ? fmtTemp(d.temperatureMaxC) : '—',
  min: d.temperatureMinC !== null ? fmtTemp(d.temperatureMinC) : '—',
})

/**
 * Строка погоды: сегодня крупно и два следующих дня. Цвет плитки по погоде (см. weather.ts), поэтому это единственное
 * цветное пятно на главной. На телефоне «сегодня» занимает всю ширину, два дня идут парой под ним.
 */
export function WeatherStrip({ days, now }: { days: DayForecast[]; now: Date }) {
  const todayKey = dayInZone(now)
  const index = Math.max(0, days.findIndex((d) => d.date === todayKey))
  const today = days[index]
  if (!today) return null
  const next = days.slice(index + 1, index + 3)

  return (
    <section aria-label="Погода в Минске" className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <TodayTile day={today} />
      {next.map((d, i) => (
        <DayTile key={d.date} day={d} label={i === 0 ? 'Завтра' : weekday(d.date)} />
      ))}
    </section>
  )
}

function Icon({ icon: IconComponent, color, size }: { icon: LucideIcon; color: string; size: string }) {
  return <IconComponent className={`${size} shrink-0`} style={{ color }} aria-hidden />
}

function TodayTile({ day }: { day: DayForecast }) {
  const info = describeWeather(day.weatherCode)
  const tone = TONE_STYLES[info.tone]
  const t = temps(day)
  return (
    <div className="col-span-2 flex items-center gap-4 rounded-3xl px-4 py-3.5 sm:col-span-1" style={{ backgroundColor: tone.bg, color: WEATHER_TEXT }}>
      <Icon icon={info.icon} color={tone.icon} size="size-10" />
      <div className="min-w-0">
        <p className="text-xs" style={{ color: tone.secondary }}>
          Сегодня · Минск
        </p>
        <p className="text-[1.65rem] font-bold leading-tight tracking-tight">
          {t.max}
          <span className="ml-1 text-sm font-medium" style={{ color: tone.secondary }}>
            / {t.min}
          </span>
        </p>
        <p className="text-sm" style={{ color: tone.secondary }}>
          {info.label}
        </p>
        {day.hazards.length > 0 && (
          <p className="text-sm font-semibold" style={{ color: WEATHER_HAZARD }}>
            Ожидается: {day.hazards.map((h) => HAZARD_PHRASE[h] ?? h).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}

function DayTile({ day, label }: { day: DayForecast; label: string }) {
  const info = describeWeather(day.weatherCode)
  const tone = TONE_STYLES[info.tone]
  const t = temps(day)
  return (
    <div className="rounded-3xl px-4 py-3" style={{ backgroundColor: tone.bg, color: WEATHER_TEXT }}>
      <p className="text-xs" style={{ color: tone.secondary }}>
        {label}
      </p>
      <Icon icon={info.icon} color={tone.icon} size="my-1 size-6" />
      <p className="font-bold">
        {t.max}
        <span className="ml-1 font-medium" style={{ color: tone.secondary }}>
          / {t.min}
        </span>
      </p>
      <p className="truncate text-xs" style={{ color: tone.secondary }}>
        {info.label}
      </p>
    </div>
  )
}
