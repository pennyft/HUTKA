import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

interface MenuProps {
  /** Подпись кнопки для скринридера */
  label: string
  button: ReactNode
  children: (close: () => void) => ReactNode
}

/**
 * Выпадающее меню (раскрывающаяся панель): кнопка с aria-expanded, закрытие по Esc, клику снаружи и смене страницы.
 * Стрелками по пунктам не ходит, пункты переключаются Tab.
 */
export function DropdownMenu({ label, button, children }: MenuProps) {
  // Храним страницу, на которой меню открыли: при переходе на другую оно считается закрытым без эффекта
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const { pathname } = useLocation()
  const open = openedAt === pathname
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(open) : next
    setOpenedAt(value ? pathname : null)
  }
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpenedAt(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenedAt(null)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-xl px-1.5 transition-colors hover:bg-surface-2"
      >
        {button}
      </button>
      {open && (
        <div id={panelId} className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          {children(() => setOpenedAt(null))}
        </div>
      )}
    </div>
  )
}

const itemClass = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2'

export function MenuHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-3 py-2">
      <p className="truncate text-sm font-medium text-fg">{title}</p>
      {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
    </div>
  )
}

export function MenuSeparator() {
  return <div role="separator" className="my-1.5 h-px bg-line" />
}

export function MenuLink({ to, icon: Icon, children }: { to: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <Link to={to} className={itemClass}>
      <Icon className="size-[18px] shrink-0 text-muted" />
      {children}
    </Link>
  )
}

export function MenuButton({ icon: Icon, onClick, children }: { icon: ComponentType<{ className?: string }>; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={itemClass}>
      <Icon className="size-[18px] shrink-0 text-muted" />
      {children}
    </button>
  )
}
