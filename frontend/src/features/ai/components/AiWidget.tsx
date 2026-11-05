import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useMediaQuery } from '@/shared/lib/useMediaQuery'
import { cabinetFor } from '../logic'
import { useAiStore } from '../store'
import { AiPanel } from './AiPanel'

/**
 * B22. Плавающий помощник на всех страницах кабинетов арендатора и партнёра (подключается в их layout'ах).
 * Кнопка стоит над нижним меню на телефоне (у страницы машины выше, чтобы не закрывать полосу «Забронировать»).
 * История чата хранится в памяти приложения и очищается при смене пользователя. На телефоне окно закрывается
 * при переходе на другую страницу, на компьютере остаётся открытым.
 */
export default function AiWidget() {
  const token = useAuthStore((s) => s.token)
  const { pathname } = useLocation()
  const open = useAiStore((s) => s.open)
  const owner = useAiStore((s) => s.owner)
  const setOpen = useAiStore((s) => s.setOpen)
  const isWide = useMediaQuery('(min-width: 640px)')
  const fab = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const cabinet = cabinetFor(pathname)

  // чужую историю не показываем: при смене пользователя чат начинается заново
  useEffect(() => {
    if (token && owner !== token) useAiStore.getState().reset(token)
  }, [token, owner])

  // на телефоне окно закрывается при переходе по ссылке
  useEffect(() => {
    if (!isWide) useAiStore.getState().setOpen(false)
  }, [pathname, isWide])

  // после закрытия фокус возвращается на кнопку
  useEffect(() => {
    if (wasOpen.current && !open) fab.current?.focus()
    wasOpen.current = open
  }, [open])

  if (!token) return null

  const onCarPage = /^\/cars\/[^/]+$/.test(pathname)
  const position =
    cabinet === 'partner'
      ? 'bottom-4'
      : onCarPage
        ? 'bottom-[calc(9.5rem+env(safe-area-inset-bottom))]'
        : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]'

  return (
    <>
      {!open && (
        <button
          ref={fab}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть помощника"
          aria-expanded={false}
          aria-controls="ai-panel"
          className={`fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-pop transition-transform hover:scale-105 active:scale-95 ${position} lg:bottom-6 lg:right-6`}
        >
          <MessageCircle className="size-6" aria-hidden />
        </button>
      )}
      {open && <AiPanel cabinet={cabinet} onClose={() => setOpen(false)} onNavigate={() => !isWide && setOpen(false)} />}
    </>
  )
}
