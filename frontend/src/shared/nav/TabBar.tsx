import { Lock } from 'lucide-react'
import { NavEntryLink } from './NavEntryLink'
import type { NavEntry } from './types'

/**
 * Нижняя панель телефона (до 5 пунктов). Прижата к низу экрана, поэтому страница в layout'е должна иметь нижний
 * отступ (pb-20). Отступ safe-area работает, если в index.html у viewport есть viewport-fit=cover.
 */
export function TabBar({ entries, label }: { entries: NavEntry[]; label: string }) {
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}>
        {entries.map((e) => (
          <li key={e.to}>
            <NavEntryLink
              entry={e}
              className={(active) =>
                `flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] leading-tight transition-colors ${
                  active ? 'font-medium text-fg' : 'text-muted'
                }`
              }
            >
              {(active) => (
                <>
                  <span className="relative">
                    <e.icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {e.locked && <Lock className="absolute -right-1.5 -top-1 size-3 rounded-full bg-surface" aria-label="Закрыто до подтверждения ВУ" />}
                  </span>
                  <span className="truncate">{e.shortLabel ?? e.label}</span>
                </>
              )}
            </NavEntryLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
