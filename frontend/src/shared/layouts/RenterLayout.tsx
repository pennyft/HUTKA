import { Outlet } from 'react-router'
import AiWidget from '@/features/ai/components/AiWidget'
import { useMe } from '@/features/auth/hooks'
import { Logo } from '@/shared/nav/Logo'
import { TopNavLinks } from '@/shared/nav/TopNavLinks'
import { TabBar } from '@/shared/nav/TabBar'
import { BellLink } from '@/shared/nav/BellLink'
import { ModeSwitch } from '@/shared/nav/ModeSwitch'
import { UserMenu } from '@/shared/nav/UserMenu'
import { renterEntries } from '@/shared/nav/entries'

/**
 * Оболочка залогиненного арендатора: верхняя панель на компьютере, нижняя панель на телефоне.
 * Её же показывает PublicLayout, когда у пользователя есть токен, поэтому каталог и карточка машины
 * не теряют меню кабинета. Пока профиль не загрузился, закрытые разделы не помечаем замком, чтобы не мигало.
 */
export function RenterLayout() {
    const { data: me } = useMe()
    const entries = renterEntries(me ? me.verificationStatus !== 'verified' : false)

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 border-b border-line bg-surface">
                <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
                    <Logo to="/app" />
                    <TopNavLinks entries={entries} label="Основная навигация" />
                    <div className="ml-auto flex items-center gap-2">
                        {me?.isPartner && <ModeSwitch mode="renter" />}
                        <BellLink to="/app/notifications" />
                        <UserMenu variant="renter" />
                    </div>
                </div>
            </header>
            <main className="pb-20 lg:pb-0">
                <Outlet />
            </main>
            <TabBar entries={entries} label="Основная навигация" />
            <AiWidget />
        </div>
    )
}