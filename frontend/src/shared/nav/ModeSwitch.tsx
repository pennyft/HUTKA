import { Link } from 'react-router'

/** Переключатель «Аренда / Партнёр» для пользователя с isPartner. На телефоне скрыт: там тот же переход есть в меню профиля. */
export function ModeSwitch({ mode }: { mode: 'renter' | 'partner' }) {
  const items = [
    { key: 'renter', to: '/app', label: 'Аренда' },
    { key: 'partner', to: '/partner', label: 'Партнёр' },
  ] as const
  return (
    <div role="group" aria-label="Режим кабинета" className="hidden items-center rounded-xl border border-line bg-surface-2 p-0.5 sm:flex">
      {items.map((i) => (
        <Link
          key={i.key}
          to={i.to}
          aria-current={mode === i.key ? 'page' : undefined}
          className={`rounded-lg px-3 py-1 text-sm transition-colors ${mode === i.key ? 'border border-line bg-surface font-medium text-fg' : 'border border-transparent text-muted hover:text-fg'}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  )
}
