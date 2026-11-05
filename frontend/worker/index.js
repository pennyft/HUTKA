// Cloudflare Worker: тот же принцип, что dev-прокси в vite.config.ts.
// Запросы /api/* уходят на бэкенд (префикс /api убирается), всё остальное отдаётся из собранного фронтенда.
const BACKEND = 'https://hutka.onrender.com'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const target = new URL(BACKEND)
      target.pathname = url.pathname.replace(/^\/api/, '') || '/'
      target.search = url.search
      return fetch(new Request(target, request))
    }

    return env.ASSETS.fetch(request)
  },
}
