import { Link, Outlet } from 'react-router'

const YEAR = new Date().getFullYear()

/** Каркас экранов входа (A2–A6): слово HUTKA, карточка по центру, подвал. Содержимое карточки — в страницах. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col justify-between px-4 py-8 sm:px-6">
      <main className="flex w-full flex-grow flex-col items-center justify-center">
        <Link to="/cars" className="mb-8 flex select-none items-center gap-1.5 text-3xl font-extrabold tracking-wider text-fg">
          HUTKA
          <span aria-hidden className="mt-1 size-2.5 rounded-full bg-accent" />
        </Link>
        <div className="w-full max-w-[500px] rounded-3xl border border-line bg-surface p-8 sm:p-10">
          <Outlet />
        </div>
      </main>
      <footer className="py-4 text-center">
        <p className="text-xs text-muted">© {YEAR} HUTKA. Все права защищены.</p>
      </footer>
    </div>
  )
}
