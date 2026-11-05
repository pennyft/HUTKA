import { NavLink } from 'react-router'

const TABS = [
  { to: '/admin/finance', label: 'Сводка', end: true },
  { to: '/admin/finance/commissions', label: 'Комиссии', end: false },
  { to: '/admin/finance/payouts', label: 'Выплаты', end: false },
]

/** Переключатель разделов финансов (сводка, комиссии, выплаты). */
export function FinanceTabs() {
  return (
    <nav aria-label="Разделы финансов" className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `h-9 rounded-full border px-3.5 text-sm leading-9 transition-colors ${isActive ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
