import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  label: string
  /** Верх панели: обычно логотип */
  header: ReactNode
  children: ReactNode
}

/**
 * Выдвижная панель меню для телефона (партнёр, админ). Закрывается по Esc, клику на затемнение и кнопке.
 * Закрытие при смене страницы делает layout (у него есть pathname), здесь только состояние «открыто».
 */
export function Drawer({ open, onClose, label, header, children }: Props) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Закрыть меню" tabIndex={-1} className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={label} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          {header}
          <button type="button" autoFocus onClick={onClose} aria-label="Закрыть меню" className="flex size-9 items-center justify-center rounded-xl hover:bg-surface-2">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  )
}
