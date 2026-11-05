import { Lock } from 'lucide-react'
import { NavEntryLink } from './NavEntryLink'
import { CountBadge } from './CountBadge'
import type { NavEntry } from './types'

/** Горизонтальное меню верхней панели. Скрыто на телефоне: там работает TabBar. */
export function TopNavLinks({ entries, label }: { entries: NavEntry[]; label: string }) {
  return (
    <nav aria-label={label} className="hidden items-center gap-1 lg:ml-4 lg:flex">
      {entries.map((e) => (
        <NavEntryLink
          key={e.to}
          entry={e}
          className={(active) =>
            `flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
              active ? 'bg-surface-2 font-medium text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
            }`
          }
        >
          {() => (
            <>
              {e.label}
              {e.locked && <Lock className="size-3.5" aria-label="Закрыто до подтверждения ВУ" />}
              <CountBadge count={e.badge} urgent={e.urgent} />
            </>
          )}
        </NavEntryLink>
      ))}
    </nav>
  )
}
