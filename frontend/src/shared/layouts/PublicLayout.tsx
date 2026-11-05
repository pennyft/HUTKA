import { Link, Outlet } from 'react-router'
import { useAuthStore } from '@/features/auth/store'
import { Logo } from '@/shared/nav/Logo'
import { RenterLayout } from './RenterLayout'

/**
 * Каталог и карточка машины открыты без токена. Гость видит простую шапку («Войти», «Регистрация»),
 * залогиненный пользователь видит ту же оболочку, что и в кабинете (RenterLayout), чтобы меню не пропадало.
 * Если токен окажется недействительным, первый же 401 его сбросит и шапка станет гостевой.
 */
export function PublicLayout() {
  const token = useAuthStore((s) => s.token)
  if (token) return <RenterLayout />

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Logo to="/cars" />
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
              Войти
            </Link>
            <Link to="/register" className="rounded-xl bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover">
              Регистрация
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
