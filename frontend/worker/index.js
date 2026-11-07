const BACKEND = 'https://desktop-l75n630.tail9a2dcb.ts.net';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            const target = new URL(BACKEND);
            target.pathname = url.pathname.replace(/^\/api/, '') || '/';
            target.search = url.search;

            try {
                // Request(url, request) копирует метод, заголовки и ТЕЛО исходного запроса
                const response = await fetch(new Request(target.toString(), request), {
                    redirect: 'manual',
                });

                // 101 (WebSocket) возвращаем как есть; иначе добавляем отладочный заголовок к копии ответа
                if (response.status === 101) return response;
                const proxied = new Response(response.body, response);
                proxied.headers.set('X-Debug-Backend', target.toString());
                return proxied;
            } catch (error) {
                return Response.json({
                    error: error.message,
                    target: target.toString(),
                }, { status: 502 });
            }
        }

        return env.ASSETS.fetch(request);
    },
};