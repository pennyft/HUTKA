import {
  Banknote,
  CalendarClock,
  Car,
  CarFront,
  ChartColumn,
  ClipboardCheck,
  CreditCard,
  Heart,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Percent,
  Scale,
  Settings,
  Star,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { underPath } from './isActive'
import type { NavEntry, NavGroup } from './types'

/** Форма брони (/app/bookings/new) продолжает сценарий «выбрал машину», поэтому подсвечивает каталог, а не «Мои поездки». */
export const catalogMatch = (p: string) => underPath('/cars')(p) || p === '/app/bookings/new'
export const tripsMatch = (p: string) => underPath('/app/bookings')(p) && p !== '/app/bookings/new'

/**
 * Кабинет арендатора. Тест ПДД и групповые поездки бэк отдаёт только verified (403 иначе, а RequireVerified
 * уводит на /app/license), поэтому до подтверждения ВУ они помечены замком и ведут на страницу верификации.
 */
export function renterEntries(locked: boolean): NavEntry[] {
  return [
    { to: '/cars', label: 'Каталог', icon: Car, match: catalogMatch },
    { to: '/app/bookings', label: 'Мои поездки', shortLabel: 'Поездки', icon: CalendarClock, match: tripsMatch },
    { to: '/app/favorites', label: 'Избранное', icon: Heart },
    { to: '/app/pdd', label: 'Тест ПДД', icon: ClipboardCheck, locked },
    { to: '/app/group-trips', label: 'Групповые поездки', shortLabel: 'Группы', icon: Users, locked },
  ]
}

/** Кабинет партнёра. pendingRequests — заявки Request to Book, на которые нужно ответить за 6 часов. */
export function partnerGroups(pendingRequests: number): NavGroup[] {
  return [
    { items: [{ to: '/partner', label: 'Дашборд', icon: LayoutDashboard, end: true }] },
    {
      title: 'Работа',
      items: [
        { to: '/partner/cars', label: 'Мои машины', icon: CarFront },
        { to: '/partner/bookings', label: 'Брони', icon: CalendarClock, badge: pendingRequests },
      ],
    },
    {
      title: 'Статистика',
      items: [
        { to: '/partner/analytics', label: 'Аналитика', icon: ChartColumn },
        { to: '/partner/reviews', label: 'Отзывы', icon: Star },
      ],
    },
    {
      title: 'Деньги',
      items: [
        { to: '/partner/payouts', label: 'Выплаты', icon: Wallet },
        { to: '/partner/payout-details', label: 'Реквизиты', icon: CreditCard },
      ],
    },
    { title: 'Помощь', items: [{ to: '/partner/support', label: 'Поддержка', icon: LifeBuoy }] },
  ]
}

export interface AdminQueues {
  licenseRequests: number
  carModeration: number
  openDisputes: number
  openTickets: number
  urgentOpenTickets: number
}

/** Админка. Счётчики очередей берутся из GET /admin/dashboard (поле queues). */
export function adminGroups(q: AdminQueues | undefined): NavGroup[] {
  return [
    { items: [{ to: '/admin', label: 'Дашборд', icon: LayoutDashboard, end: true }] },
    {
      title: 'Очереди',
      items: [
        { to: '/admin/license-requests', label: 'Проверка ВУ', icon: IdCard, badge: q?.licenseRequests },
        { to: '/admin/cars', label: 'Машины', icon: CarFront, badge: q?.carModeration },
        { to: '/admin/disputes', label: 'Споры', icon: Scale, badge: q?.openDisputes },
        { to: '/admin/tickets', label: 'Тикеты', icon: MessageSquare, badge: q?.openTickets, urgent: (q?.urgentOpenTickets ?? 0) > 0 },
      ],
    },
    {
      title: 'Данные',
      items: [
        { to: '/admin/users', label: 'Пользователи', icon: UsersRound },
        { to: '/admin/bookings', label: 'Брони', icon: CalendarClock },
      ],
    },
    {
      title: 'Финансы',
      items: [
        { to: '/admin/finance', label: 'Сводка', icon: Wallet, end: true },
        { to: '/admin/finance/commissions', label: 'Комиссии', icon: Percent },
        { to: '/admin/finance/payouts', label: 'Выплаты', icon: Banknote },
      ],
    },
    {
      title: 'Настройки',
      items: [
        { to: '/admin/pdd-questions', label: 'Вопросы ПДД', icon: ClipboardCheck },
        { to: '/admin/settings', label: 'Параметры', icon: Settings },
      ],
    },
  ]
}
