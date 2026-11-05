import { useEffect, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { FuelType, Transmission } from '@/shared/types/car'
import { normalizePriceRange, type CatalogFilters, type SortKey, type View } from '../filters'
import { FUEL_LABEL, TRANSMISSION_LABEL } from '../labels'

const chipBase = 'h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors'
const chipOff = 'border-line bg-surface text-fg hover:bg-surface-2'
const chipOn = 'border-primary bg-accent font-medium text-accent-fg'
// Обводка фокуса на самой плашке (внутри лежит прозрачный select или поле ввода)
const chipFocus = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary'

const SEATS = [2, 3, 4, 5, 6, 7, 8, 9]

interface Props {
  filters: CatalogFilters
  /** «Ближайшие» включены (нужна геолокация), хранится отдельно от адресной строки */
  nearMe: boolean
  view: View
  hasActive: boolean
  /** Меняется при «Сбросить»: заставляет поля поиска и цены перечитать значения */
  resetKey: number
  onChange: (patch: Partial<CatalogFilters>) => void
  onSort: (value: SortKey | 'distance') => void
  onView: (view: View) => void
  onReset: () => void
}

/** Панель поиска и фильтров. На телефоне ряд чипов прокручивается по горизонтали. */
export function FilterBar({ filters, nearMe, view, hasActive, resetKey, onChange, onSort, onView, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-2">
        <SearchInput key={`q-${resetKey}`} initial={filters.q} onCommit={(q) => onChange({ q })} />
        <div role="group" aria-label="Вид каталога" className="flex rounded-full border border-line bg-surface p-0.5 lg:hidden">
          {(['list', 'map'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => onView(v)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${view === v ? 'bg-primary font-medium text-primary-fg' : 'text-muted hover:text-fg'}`}
            >
              {v === 'list' ? 'Список' : 'Карта'}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        {(['auto', 'manual'] as Transmission[]).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filters.transmission === t}
            onClick={() => onChange({ transmission: filters.transmission === t ? undefined : t })}
            className={`${chipBase} ${filters.transmission === t ? chipOn : chipOff}`}
          >
            {TRANSMISSION_LABEL[t]}
          </button>
        ))}

        <SelectChip
          label="Топливо"
          value={filters.fuelType ?? ''}
          active={!!filters.fuelType}
          onChange={(v) => onChange({ fuelType: (v || undefined) as FuelType | undefined })}
          options={[{ value: '', label: 'Топливо' }, ...(Object.keys(FUEL_LABEL) as FuelType[]).map((f) => ({ value: f, label: FUEL_LABEL[f] }))]}
        />
        <SelectChip
          label="Количество мест"
          value={filters.seats !== undefined ? String(filters.seats) : ''}
          active={filters.seats !== undefined}
          onChange={(v) => onChange({ seats: v ? Number(v) : undefined })}
          options={[{ value: '', label: 'Места' }, ...SEATS.map((n) => ({ value: String(n), label: `${n} мест` }))]}
        />

        <PriceRange
          key={`p-${resetKey}`}
          min={filters.minPrice}
          max={filters.maxPrice}
          onCommit={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
        />

        <SelectChip
          label="Сортировка"
          value={nearMe ? 'distance' : filters.sort}
          active={false}
          onChange={(v) => onSort(v as SortKey | 'distance')}
          options={[
            { value: 'rating', label: 'По рейтингу' },
            { value: 'price_asc', label: 'Сначала дешевле' },
            { value: 'price_desc', label: 'Сначала дороже' },
            { value: 'distance', label: 'Сначала ближайшие' },
          ]}
        />

        {hasActive && (
          <button type="button" onClick={onReset} className={`${chipBase} border-transparent text-muted underline hover:text-fg`}>
            Сбросить
          </button>
        )}
      </div>
    </div>
  )
}

/** Поиск по марке и модели (q на бэке). В адрес попадает через 350 мс после остановки ввода. */
function SearchInput({ initial, onCommit }: { initial: string; onCommit: (q: string) => void }) {
  const [value, setValue] = useState(initial)

  useEffect(() => {
    if (value.trim() === initial) return
    const t = setTimeout(() => onCommit(value.trim()), 350)
    return () => clearTimeout(t)
  }, [value, initial, onCommit])

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Марка или модель"
        aria-label="Поиск по марке и модели"
        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => setValue('')} aria-label="Очистить поиск" className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

interface SelectChipProps {
  label: string
  value: string
  active: boolean
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

/**
 * Выпадающий список в виде чипа. Видимая плашка по ширине текущего значения, а настоящий select лежит поверх неё
 * прозрачным слоем: клик и клавиатура работают как у обычного select, на телефоне открывается системный выбор.
 * (Если стилизовать сам select, его ширина равна самому длинному варианту, и стрелка «уезжает» вправо.)
 */
function SelectChip({ label, value, active, options, onChange }: SelectChipProps) {
  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label
  return (
    <div className={`relative inline-flex items-center gap-1.5 whitespace-nowrap ${chipBase} ${active ? chipOn : chipOff} ${chipFocus}`}>
      <span className="pointer-events-none">{current}</span>
      <ChevronDown className={`pointer-events-none size-4 ${active ? 'text-accent-fg' : 'text-muted'}`} aria-hidden />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Цена за час, BYN: «от» и «до». Применяется по уходу из поля или Enter, чтобы не слать запрос на каждую цифру. */
function PriceRange({ min, max, onCommit }: { min?: number; max?: number; onCommit: (min?: number, max?: number) => void }) {
  const [from, setFrom] = useState(min !== undefined ? String(min) : '')
  const [to, setTo] = useState(max !== undefined ? String(max) : '')
  const active = min !== undefined || max !== undefined

  const toNumber = (v: string) => {
    const n = Number(v.replace(',', '.'))
    return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
  }
  const commit = () => {
    // перепутанные границы меняем местами и показываем это в полях
    const { minPrice, maxPrice } = normalizePriceRange(toNumber(from), toNumber(to))
    setFrom(minPrice !== undefined ? String(minPrice) : '')
    setTo(maxPrice !== undefined ? String(maxPrice) : '')
    if (minPrice !== min || maxPrice !== max) onCommit(minPrice, maxPrice)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit()
  }
  // на тёмной плашке (фильтр включён) подсказка «от/до» должна оставаться читаемой
  const inputClass = `w-12 bg-transparent text-center text-sm focus:outline-none ${active ? 'placeholder:text-accent-fg/70' : 'placeholder:text-muted'}`

  return (
    <div role="group" aria-label="Цена за час, BYN" className={`${chipBase} flex items-center gap-1 ${active ? chipOn : chipOff} ${chipFocus}`}>
      <span className={active ? 'text-accent-fg' : 'text-muted'}>Цена</span>
      <input inputMode="decimal" aria-label="Цена от, BYN в час" placeholder="от" value={from} onChange={(e) => setFrom(e.target.value)} onBlur={commit} onKeyDown={onKey} className={inputClass} />
      <span aria-hidden>–</span>
      <input inputMode="decimal" aria-label="Цена до, BYN в час" placeholder="до" value={to} onChange={(e) => setTo(e.target.value)} onBlur={commit} onKeyDown={onKey} className={inputClass} />
    </div>
  )
}
