import type { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import { createStompClient } from '@/api/ws'

export type SocketStatus = 'disconnected' | 'connecting' | 'connected'
type Handler = (body: string) => void

/**
 * Одно STOMP-соединение на пользователя с подписками по требованию.
 * Уведомления и чаты групповых поездок используют общий канал: подписаться можно в любой момент (до или после
 * подключения), а после обрыва связи все подписки восстанавливаются сами. Клиент создаётся через factory,
 * поэтому в тестах подставляется поддельный.
 */
export function createHub(factory: (token: string) => Client) {
  let client: Client | null = null
  let status: SocketStatus = 'disconnected'
  const handlers = new Map<string, Set<Handler>>()
  const live = new Map<string, StompSubscription>()
  const statusListeners = new Set<() => void>()

  function setStatus(next: SocketStatus) {
    if (next === status) return
    status = next
    statusListeners.forEach((l) => l())
  }

  function attach(destination: string) {
    if (!client?.connected || live.has(destination)) return
    const sub = client.subscribe(destination, (msg: IMessage) => {
      handlers.get(destination)?.forEach((h) => h(msg.body))
    })
    live.set(destination, sub)
  }

  function disconnect() {
    const current = client
    client = null
    live.clear()
    setStatus('disconnected')
    if (current) void current.deactivate()
  }

  return {
    /** Открывает соединение с токеном. Повторный вызов закрывает предыдущее. */
    connect(token: string) {
      if (client) disconnect()
      const c = factory(token)
      client = c
      setStatus('connecting')
      c.onConnect = () => {
        live.clear() // после переподключения старые подписки на сервере уже не существуют
        handlers.forEach((_, destination) => attach(destination))
        setStatus('connected')
      }
      c.onWebSocketClose = () => {
        live.clear()
        if (client === c) setStatus('connecting')
      }
      c.activate()
    },

    disconnect,

    /** Подписка на очередь. Возвращает функцию отписки. Несколько обработчиков на одну очередь делят одну подписку. */
    subscribe(destination: string, handler: Handler): () => void {
      let set = handlers.get(destination)
      if (!set) {
        set = new Set()
        handlers.set(destination, set)
      }
      set.add(handler)
      attach(destination)
      return () => {
        const current = handlers.get(destination)
        if (!current) return
        current.delete(handler)
        if (current.size === 0) {
          handlers.delete(destination)
          try {
            live.get(destination)?.unsubscribe()
          } catch {
            // соединение уже закрыто: подписка исчезла вместе с ним
          }
          live.delete(destination)
        }
      }
    },

    /** Отправка кадра. false, если соединения сейчас нет (сообщение не отправлено). */
    publish(destination: string, body: string): boolean {
      if (!client?.connected) return false
      client.publish({ destination, body })
      return true
    },

    getStatus: () => status,
    onStatusChange(listener: () => void): () => void {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },
  }
}

export const hub = createHub(createStompClient)
