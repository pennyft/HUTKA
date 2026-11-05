import { Briefcase, ChevronDown, IdCard, LifeBuoy, LogOut, UserRound } from 'lucide-react'
import { useMe } from '@/features/auth/hooks'
import { DropdownMenu, MenuButton, MenuHeader, MenuLink, MenuSeparator } from './DropdownMenu'
import { useLogout } from './useLogout'

/** Меню профиля. variant влияет на набор пунктов: у арендатора поддержка и партнёрство, у партнёра переход в кабинет арендатора. */
export function UserMenu({ variant }: { variant: 'renter' | 'partner' }) {
  const { data: me } = useMe()
  const logout = useLogout()
  const initials = me ? `${me.firstName[0] ?? ''}${me.lastName[0] ?? ''}`.toUpperCase() : ''
  const verified = me?.verificationStatus === 'verified'

  return (
    <DropdownMenu
      label="Меню профиля"
      button={
        <>
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-fg">
            {initials || <UserRound className="size-4" aria-hidden />}
          </span>
          <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden />
        </>
      }
    >
      {() => (
        <>
          {me && <MenuHeader title={`${me.firstName} ${me.lastName}`} subtitle={me.email} />}
          <MenuSeparator />
          <MenuLink to="/app/profile" icon={UserRound}>
            Профиль
          </MenuLink>
          {variant === 'renter' && me && !verified && (
            <MenuLink to="/app/license" icon={IdCard}>
              {me.verificationStatus === 'pending' ? 'ВУ на проверке' : 'Подтвердить ВУ'}
            </MenuLink>
          )}
          {variant === 'renter' && (
            <MenuLink to="/app/support" icon={LifeBuoy}>
              Поддержка
            </MenuLink>
          )}
          {variant === 'renter' && (me?.isPartner || verified) && (
            <>
              <MenuSeparator />
              {me?.isPartner ? (
                <MenuLink to="/partner" icon={Briefcase}>
                  Кабинет партнёра
                </MenuLink>
              ) : (
                <MenuLink to="/app/become-partner" icon={Briefcase}>
                  Стать партнёром
                </MenuLink>
              )}
            </>
          )}
          {variant === 'partner' && (
            <>
              <MenuSeparator />
              <MenuLink to="/app" icon={UserRound}>
                Кабинет арендатора
              </MenuLink>
            </>
          )}
          <MenuSeparator />
          <MenuButton icon={LogOut} onClick={logout}>
            Выйти
          </MenuButton>
        </>
      )}
    </DropdownMenu>
  )
}
