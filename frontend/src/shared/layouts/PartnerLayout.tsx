import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Menu } from 'lucide-react'
import { Logo } from '@/shared/nav/Logo'
import { SideNav } from '@/shared/nav/SideNav'
import { Drawer } from '@/shared/nav/Drawer'
import { BellLink } from '@/shared/nav/BellLink'
import { ModeSwitch } from '@/shared/nav/ModeSwitch'
import { UserMenu } from '@/shared/nav/UserMenu'
import { partnerGroups } from '@/shared/nav/entries'
import { usePartnerPendingRequests } from '@/shared/nav/useNavData'

/**
 * Кабинет партнёра: боковое меню на компьютере, выдвижная панель на телефоне.
 * Счётчик на «Брони» показывает заявки Request to Book, на которые нужно ответить в течение 6 часов.
 */
export function PartnerLayout() {
  const pending = usePartnerPendingRequests()
  const groups = partnerGroups(pending)
  // Меню открыто только на той странице, где его открыли: при переходе оно закрывается без эффекта
  const { pathname } = useLocation()
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const drawerOpen = openedAt === pathname
  const setDrawerOpen = (open: boolean) => setOpenedAt(open ? pathname : null)

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-4 overflow-y-auto p-3">
          <div className="flex h-8 items-center px-3">
            <Logo to="/partner" tag="Партнёр" />
          </div>
          <SideNav groups={groups} label="Меню партнёра" badgeLabel="ждут ответа" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={pending > 0 ? `Открыть меню, заявок без ответа: ${pending}` : 'Открыть меню'}
            className="relative -ml-1 flex size-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
            {pending > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />}
          </button>
          <div className="lg:hidden">
            <Logo to="/partner" tag="Партнёр" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ModeSwitch mode="partner" />
            <BellLink to="/partner/notifications" />
            <UserMenu variant="partner" />
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} label="Меню партнёра" header={<Logo to="/partner" tag="Партнёр" />}>
        <SideNav groups={groups} label="Меню партнёра" badgeLabel="ждут ответа" />
      </Drawer>
    </div>
  )
}
