import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatPrice } from '../format'

const chipBase =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors'
const chipIdle = 'border-line bg-surface text-fg hover:bg-surface-2'
const chipActive = 'border-accent bg-accent font-medium text-fg'

/** Фильтр-переключатель: выбранный подсвечен акцентом. */
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
      {children}
    </button>
  )
}

interface SelectChipProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  /** Подсветить акцентом (фильтр применён). */
  active?: boolean
}

/** Нативный select в форме «таблетки»: на телефоне открывается системный список. */
export function SelectChip({ label, value, options, onChange, active }: SelectChipProps) {
  return (
    <label className="relative inline-flex shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${chipBase} cursor-pointer appearance-none pr-8 text-base sm:text-sm ${active ? chipActive : chipIdle}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </label>
  )
}

interface PriceProps {
  min?: number
  max?: number
  onApply: (min: number | undefined, max: number | undefined) => void
}

/** «Цена за час»: всплывающая панель с полями «от» и «до». */
export function PricePopover({ min, max, onApply }: PriceProps) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const active = min !== undefined || max !== undefined

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open) {
      setFrom(min !== undefined ? String(min) : '')
      setTo(max !== undefined ? String(max) : '')
    }
    setOpen((v) => !v)
  }

  function apply() {
    let lo = from === '' ? undefined : Number(from)
    let hi = to === '' ? undefined : Number(to)
    if (lo !== undefined && hi !== undefined && lo > hi) [lo, hi] = [hi, lo]
    onApply(lo, hi)
    setOpen(false)
  }

  const label = active
    ? `${min !== undefined ? formatPrice(min) : '0'}–${max !== undefined ? formatPrice(max) : '∞'} BYN/ч`
    : 'Цена за час'

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={toggle} aria-expanded={open} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
        {label}
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-card">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="от"
              aria-label="Цена от"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base focus:border-primary focus:outline-none sm:text-sm"
            />
            <span className="text-muted">—</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="до"
              aria-label="Цена до"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base focus:border-primary focus:outline-none sm:text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onApply(undefined, undefined)
                setOpen(false)
              }}
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2"
            >
              Сбросить
            </button>
            <button type="button" onClick={apply} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
