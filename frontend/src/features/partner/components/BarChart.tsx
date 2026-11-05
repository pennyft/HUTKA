import { barFractions } from '../analyticsLogic'

export interface Bar {
  key: string
  label: string
  value: number
}

interface Props {
  bars: Bar[]
  /** Название графика для скринридера. */
  title: string
  format: (value: number) => string
}

/**
 * Простой столбчатый график без библиотек: высота столбца пропорциональна максимуму. Для скринридера рядом скрытый список
 * «подпись: значение», сами столбцы он пропускает. Если все значения нулевые, пишем, что данных нет.
 */
export function BarChart({ bars, title, format }: Props) {
  const fractions = barFractions(bars.map((b) => b.value))
  const empty = bars.every((b) => b.value <= 0)
  return (
    <figure aria-label={title} className="rounded-3xl border border-line bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold text-fg">{title}</figcaption>
      {empty ? (
        <p className="py-8 text-center text-sm text-muted">За этот период данных пока нет.</p>
      ) : (
        <>
          <div aria-hidden className="flex h-40 items-end gap-1.5">
            {bars.map((b, i) => (
              <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
                <span className="mb-0.5 truncate text-[10px] text-muted">{b.value > 0 ? format(b.value) : ''}</span>
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(fractions[i] * 100, b.value > 0 ? 3 : 0)}%` }} />
              </div>
            ))}
          </div>
          <div aria-hidden className="mt-1 flex gap-1.5">
            {bars.map((b) => (
              <span key={b.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
                {b.label}
              </span>
            ))}
          </div>
          <ul className="sr-only">
            {bars.map((b) => (
              <li key={b.key}>
                {b.label}: {format(b.value)}
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  )
}
