import { Plus, X } from 'lucide-react'
import { Checkbox } from '@/shared/ui/fields'
import { Button } from '@/shared/ui/Button'
import { DAY_KEYS, DAY_LABEL, emptySchedule, MAX_WINDOWS_PER_DAY, timeOptions, uniformSchedule, type DayKey, type ScheduleDraft } from '../schedule'

interface Props {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  value: ScheduleDraft
  onChange: (next: ScheduleDraft) => void
  error?: string | null
}

const FROM = timeOptions(false)
const TO = timeOptions(true)
const select = 'h-10 rounded-xl border border-line bg-surface px-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

/**
 * Расписание доступности (необязательное). Выключено: машину можно бронировать в любое время. Включено: по дням недели окна
 * «с и до»; день без окон значит «машина недоступна». Время с шагом 30 минут, конец суток 24:00.
 */
export function ScheduleEditor({ enabled, onToggle, value, onChange, error }: Props) {
  const setDay = (day: DayKey, windows: ScheduleDraft[DayKey]) => onChange({ ...value, [day]: windows })

  return (
    <div>
      <Checkbox checked={enabled} onChange={(e) => onToggle(e.target.checked)}>
        Ограничить время, когда машину можно брать
      </Checkbox>

      {enabled && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onChange(uniformSchedule({ from: '08:00', to: '22:00' }))} className="sm:w-auto">
              Каждый день 08:00–22:00
            </Button>
            <Button type="button" variant="outline" onClick={() => onChange(uniformSchedule({ from: '00:00', to: '24:00' }))} className="sm:w-auto">
              Круглосуточно
            </Button>
            <Button type="button" variant="outline" onClick={() => onChange(emptySchedule())} className="sm:w-auto">
              Очистить
            </Button>
          </div>

          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {DAY_KEYS.map((day) => (
              <li key={day} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5">
                <span className="w-8 pt-2 text-sm font-semibold text-fg">{DAY_LABEL[day]}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  {value[day].length === 0 && <p className="pt-2 text-sm text-muted">Недоступна</p>}
                  {value[day].map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select aria-label={`${DAY_LABEL[day]}: начало окна ${i + 1}`} value={w.from} className={select} onChange={(e) => setDay(day, value[day].map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))}>
                        {FROM.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <span aria-hidden className="text-muted">
                        –
                      </span>
                      <select aria-label={`${DAY_LABEL[day]}: конец окна ${i + 1}`} value={w.to} className={select} onChange={(e) => setDay(day, value[day].map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}>
                        {TO.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <button type="button" aria-label={`${DAY_LABEL[day]}: удалить окно ${i + 1}`} onClick={() => setDay(day, value[day].filter((_, j) => j !== i))} className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
                {value[day].length < MAX_WINDOWS_PER_DAY && (
                  <button type="button" aria-label={`${DAY_LABEL[day]}: добавить окно`} onClick={() => setDay(day, [...value[day], { from: '08:00', to: '22:00' }])} className="rounded-full border border-line p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg">
                    <Plus className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
