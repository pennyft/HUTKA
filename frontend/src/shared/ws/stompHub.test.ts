import type { Client } from '@stomp/stompjs'
import { describe, expect, it, vi } from 'vitest'
import { createHub } from './stompHub'

/** Минимальный поддельный STOMP-клиент: помнит подписки и позволяет «прислать» сообщение. */
function fakeClient() {
  const subs = new Map<string, (m: { body: string }) => void>()
  const unsubscribed: string[] = []
  const published: { destination: string; body: string }[] = []
  const c = {
    connected: false,
    onConnect: undefined as undefined | (() => void),
    onWebSocketClose: undefined as undefined | (() => void),
    activate: vi.fn(),
    deactivate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((destination: string, cb: (m: { body: string }) => void) => {
      subs.set(destination, cb)
      return { id: destination, unsubscribe: () => unsubscribed.push(destination) }
    }),
    publish: vi.fn((p: { destination: string; body: string }) => published.push(p)),
  }
  return {
    c,
    subs,
    unsubscribed,
    published,
    open() {
      c.connected = true
      c.onConnect?.()
    },
    drop() {
      c.connected = false
      c.onWebSocketClose?.()
    },
  }
}

const setup = () => {
  const f = fakeClient()
  const hub = createHub(() => f.c as unknown as Client)
  return { f, hub }
}

describe('stompHub', () => {
  it('подписка до подключения применяется после подключения', () => {
    const { f, hub } = setup()
    const got: string[] = []
    hub.connect('t')
    hub.subscribe('/q/a', (b) => got.push(b))
    expect(f.c.subscribe).not.toHaveBeenCalled()
    f.open()
    f.subs.get('/q/a')?.({ body: 'hi' })
    expect(got).toEqual(['hi'])
    expect(hub.getStatus()).toBe('connected')
  })

  it('подписка после подключения срабатывает сразу', () => {
    const { f, hub } = setup()
    hub.connect('t')
    f.open()
    hub.subscribe('/q/b', () => {})
    expect(f.c.subscribe).toHaveBeenCalledWith('/q/b', expect.any(Function))
  })

  it('несколько обработчиков делят одну подписку, отписка последнего закрывает её', () => {
    const { f, hub } = setup()
    hub.connect('t')
    f.open()
    const a: string[] = []
    const b: string[] = []
    const offA = hub.subscribe('/q/c', (x) => a.push(x))
    const offB = hub.subscribe('/q/c', (x) => b.push(x))
    expect(f.c.subscribe).toHaveBeenCalledTimes(1)
    f.subs.get('/q/c')?.({ body: 'm' })
    expect([a, b]).toEqual([['m'], ['m']])
    offA()
    expect(f.unsubscribed).toEqual([])
    offB()
    expect(f.unsubscribed).toEqual(['/q/c'])
  })

  it('после обрыва и переподключения подписки восстанавливаются', () => {
    const { f, hub } = setup()
    hub.connect('t')
    f.open()
    hub.subscribe('/q/d', () => {})
    expect(hub.getStatus()).toBe('connected')
    f.drop()
    expect(hub.getStatus()).toBe('connecting')
    f.open()
    expect(f.c.subscribe).toHaveBeenCalledTimes(2)
    expect(hub.getStatus()).toBe('connected')
  })

  it('publish: без соединения false, с соединением отправляет', () => {
    const { f, hub } = setup()
    hub.connect('t')
    expect(hub.publish('/app/x', '{}')).toBe(false)
    f.open()
    expect(hub.publish('/app/x', '{"body":"a"}')).toBe(true)
    expect(f.published).toEqual([{ destination: '/app/x', body: '{"body":"a"}' }])
  })

  it('disconnect закрывает клиент и сообщает статус', () => {
    const { f, hub } = setup()
    const seen: string[] = []
    hub.onStatusChange(() => seen.push(hub.getStatus()))
    hub.connect('t')
    f.open()
    hub.disconnect()
    expect(f.c.deactivate).toHaveBeenCalled()
    expect(seen).toEqual(['connecting', 'connected', 'disconnected'])
  })
})
