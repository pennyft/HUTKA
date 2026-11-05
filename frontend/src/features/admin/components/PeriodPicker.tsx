import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { periodProblem, presetPeriod, PRESET_LABEL, type PeriodPreset } from '../finance/logic'
import type { Period } from '../finance/types'

interface Props {
  value: Period
  onChange: (p: Period) => void
}

/** Выбор периода по датам и быстрые периоды. Пустые даты значат «с начала текущего месяца до сейчас». */
export function PeriodPicker({ value, onChange }: Props) {
  const problem = periodProblem(value)
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="С даты" type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
        <TextField label="По дату включительно" type="date" value={value.to} min={value.from || undefined} error={problem ?? undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(PRESET_LABEL) as PeriodPreset[]).map((p) => (
          <Button key={p} type="button" variant="outline" onClick={() => onChange(presetPeriod(p, new Date()))} className="sm:w-auto">
            {PRESET_LABEL[p]}
          </Button>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange({ from: '', to: '' })} className="sm:w-auto">
          Сбросить
        </Button>
      </div>
    </div>
  )
}
