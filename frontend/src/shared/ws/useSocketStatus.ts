import { useSyncExternalStore } from 'react'
import { hub, type SocketStatus } from './stompHub'

/** Состояние соединения: disconnected (нет токена), connecting (подключаемся или переподключаемся), connected. */
export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(hub.onStatusChange, hub.getStatus, () => 'disconnected')
}
