import { NavEntryLink } from './NavEntryLink'
import { CountBadge } from './CountBadge'
import type { NavGroup } from './types'

/** Боковое меню с группами (партнёр и админ). Счётчики справа, активный пункт выделен фоном. */
export function SideNav({ groups, label, badgeLabel = 'новых' }: { groups: NavGroup[]; label: string; badgeLabel?: string }) {
  return (
    <nav aria-label={label} className="space-y-5">
      {groups.map((group, i) => (
        <div key={group.title ?? i}>
          {group.title && <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-muted">{group.title}</p>}
          <ul className="space-y-0.5">
            {group.items.map((e) => (
              <li key={e.to}>
                <NavEntryLink
                  entry={e}
                  className={(active) =>
                    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-surface-2 font-medium text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                    }`
                  }
                >
                  {() => (
                    <>
                      <e.icon className="size-[18px] shrink-0" aria-hidden />
                      <span className="truncate">{e.label}</span>
                      <CountBadge count={e.badge} urgent={e.urgent} label={badgeLabel} className="ml-auto" />
                    </>
                  )}
                </NavEntryLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
