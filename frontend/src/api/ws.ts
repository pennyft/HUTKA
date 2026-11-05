import { Client } from '@stomp/stompjs'
import { wsUrl } from '@/shared/config/env'

/**
 * STOMP-клиент. Бэк: endpoint /ws (без SockJS), токен — нативный заголовок кадра CONNECT
 * `Authorization: Bearer <token>`. Подписки: /user/queue/notifications, /user/queue/group-trips/{id}/chat,
 * /user/queue/errors. Отправка в чат: /app/group-trips/{id}/chat.
 */
export function createStompClient(token: string): Client {
  return new Client({
    brokerURL: wsUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
  })
}
