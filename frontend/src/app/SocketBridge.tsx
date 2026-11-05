import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { hub } from '@/shared/ws/stompHub'

/** Типы уведомлений, после которых нужно перечитать профиль (статус ВУ, партнёрство). */
const ME_TYPES = new Set(['license_approved', 'license_rejected', 'car_approved'])

/**
 * Держит общее STOMP-соединение (shared/ws/stompHub), пока есть токен, и слушает /user/queue/notifications.
 * Чаты групповых поездок подписываются на то же соединение сами (features/group-trips).
 * Тело уведомления: NotificationResponse с полем type (подтверждено по NotificationService бэка).
 */
export function SocketBridge() {
    const token = useAuthStore((s) => s.token)
    const qc = useQueryClient()

    useEffect(() => {
        if (!token) {
            hub.disconnect()
            return
        }
        hub.connect(token)
        const off = hub.subscribe('/user/queue/notifications', (body) => {
            let type: string | undefined
            try {
                type = (JSON.parse(body) as { type?: string }).type
            } catch {
                // не JSON: обновим всё
            }
            qc.invalidateQueries({ queryKey: ['notifications'] })
            // счётчики в меню (колокольчик, заявки партнёра)
            qc.invalidateQueries({ queryKey: ['nav'] })
            // брони: партнёр ответил, статус изменился, поездка началась или завершилась
            qc.invalidateQueries({ queryKey: ['bookings'] })
            if (!type || ME_TYPES.has(type)) qc.invalidateQueries({ queryKey: ['me'] })
        })
        return () => {
            off()
            hub.disconnect()
        }
    }, [token, qc])

    return null
}