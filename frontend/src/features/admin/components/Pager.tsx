import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageCount, rangeText } from '../logic'

interface Props {
  page: number
  size: number
  total: number
  onPage: (page: number) => void
}

/** Нижняя панель списка: диапазон записей и переход на предыдущую и следующую страницу. Страницы с 0, как в API. */
export function Pager({ page, size, total, onPage }: Props) {
  const pages = pageCount(total, size)
  return (
    <nav aria-label="Страницы списка" className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
      <span aria-live="polite">{rangeText(page, size, total)}</span>
      <span className="flex items-center gap-2">
        <button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Предыдущая страница" className="rounded-xl border border-line bg-surface p-2 text-fg transition-colors hover:bg-surface-2 disabled:opacity-40">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span>
          {page + 1} / {pages}
        </span>
        <button type="button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Следующая страница" className="rounded-xl border border-line bg-surface p-2 text-fg transition-colors hover:bg-surface-2 disabled:opacity-40">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </span>
    </nav>
  )
}
