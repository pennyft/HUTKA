import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { ChevronDown, KeyRound, LogOut, Menu, UserRound } from 'lucide-react'
import { adminHttp } from '@/api/adminHttp'
import { useAdminStore } from '@/features/admin/store'
import { Logo } from '@/shared/nav/Logo'
import { SideNav } from '@/shared/nav/SideNav'
import { Drawer } from '@/shared/nav/Drawer'
import { DropdownMenu, MenuButton, MenuHeader, MenuLink, MenuSeparator } from '@/shared/nav/DropdownMenu'
import { adminGroups } from '@/shared/nav/entries'
import { useAdminQueues } from '@/shared/nav/useNavData'

/**
 * Админка: боковое меню с группами и счётчиками очередей (проверка ВУ, модерация машин, споры, тикеты).
 * Счётчики приходят из GET /admin/dashboard и обновляются раз в минуту.
 */
export function AdminLayout() {
  const admin = useAdminStore((s) => s.admin)
  const setGuest = useAdminStore((s) => s.setGuest)
  const navigate = useNavigate()
  const queues = useAdminQueues()
  const groups = adminGroups(queues)
  // Меню открыто только на той странице, где его открыли: при переходе оно закрывается без эффекта
  const { pathname } = useLocation()
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const drawerOpen = openedAt === pathname
  const setDrawerOpen = (open: boolean) => setOpenedAt(open ? pathname : null)
  const queued = (queues?.licenseRequests ?? 0) + (queues?.carModeration ?? 0) + (queues?.openDisputes ?? 0) + (queues?.openTickets ?? 0)

  async function logout() {
    try {
      await adminHttp.request('/admin/auth/logout', { method: 'POST' })
    } finally {
      setGuest()
      navigate('/admin/login')
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-4 overflow-y-auto p-3">
          <div className="flex h-8 items-center px-3">
            <Logo to="/admin" tag="Админ" />
          </div>
          <SideNav groups={groups} label="Меню администратора" badgeLabel="в очереди" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={queued > 0 ? `Открыть меню, в очередях: ${queued}` : 'Открыть меню'}
            className="relative -ml-1 flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
            {queued > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />}
          </button>
          <div className="lg:hidden">
            <Logo to="/admin" tag="Админ" />
          </div>
          <div className="ml-auto">
            <DropdownMenu
              label="Меню администратора"
              button={
                <>
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-fg">
                    <UserRound className="size-4" aria-hidden />
                  </span>
                  <span className="hidden max-w-40 truncate text-sm text-fg sm:block">{admin?.displayName}</span>
                  <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
                </>
              }
            >
              {() => (
                <>
                  {admin && <MenuHeader title={admin.displayName} subtitle={admin.email} />}
                  <MenuSeparator />
                  <MenuLink to="/admin/change-password" icon={KeyRound}>
                    Сменить пароль
                  </MenuLink>
                  <MenuButton icon={LogOut} onClick={logout}>
                    Выйти
                  </MenuButton>
                </>
              )}
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} label="Меню администратора" header={<Logo to="/admin" tag="Админ" />}>
        <SideNav groups={groups} label="Меню администратора" badgeLabel="в очереди" />
      </Drawer>
    </div>
  )
}
