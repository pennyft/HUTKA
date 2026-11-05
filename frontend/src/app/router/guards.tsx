import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/features/auth/store'
import { useMe } from '@/features/auth/hooks'
import { useAdminStore } from '@/features/admin/store'
import { loadAdminSession } from '@/features/admin/session'
import { Loading } from '@/shared/ui/Loading'

/** Нужен токен. Без него — на вход, с возвратом на исходную страницу. */
export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Бронь, тест ПДД, групповые поездки, партнёрство доступны только verified (иначе бэк отвечает 403). */
export function RequireVerified() {
  const { data, isLoading } = useMe()
  if (isLoading) return <Loading />
  // needVerification: страница ВУ покажет, почему пользователя сюда привели
  if (data?.verificationStatus !== 'verified') return <Navigate to="/app/license" replace state={{ needVerification: true }} />
  return <Outlet />
}

/** Кабинет партнёра: isPartner = true. */
export function RequirePartner() {
  const { data, isLoading } = useMe()
  if (isLoading) return <Loading />
  if (!data?.isPartner) return <Navigate to="/app" replace />
  return <Outlet />
}

/** Админка: сессия проверяется запросом GET /admin/auth/me при загрузке. */
export function RequireAdmin() {
  const status = useAdminStore((s) => s.status)
  useEffect(() => {
    if (status === 'unknown') void loadAdminSession()
  }, [status])
  if (status === 'unknown') return <Loading />
  if (status === 'guest') return <Navigate to="/admin/login" replace />
  return <Outlet />
}
