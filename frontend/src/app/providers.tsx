import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'
import { SocketBridge } from './SocketBridge'
import { ToastHost } from '@/shared/ui/ToastHost'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // не повторяем на 4xx: это осмысленные ответы бэка (403, 404, 409), а не сбой сети
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketBridge />
      <ToastHost />
      {children}
    </QueryClientProvider>
  )
}
