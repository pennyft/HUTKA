import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Куда проксировать запросы в dev. Порт бэка нужно подтвердить по вашему application.yml.
  const backend = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        // Фронт ходит на /api/*, прокси убирает префикс и шлёт запрос на бэк.
        // Префикс нужен, потому что пути SPA (/cars, /login...) совпадают с путями API (/cars, ...).
        // ws: true — для STOMP по /api/ws. Origin остаётся http://localhost:5173,
        // его бэк сверяет с app.frontend-base-url.
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
