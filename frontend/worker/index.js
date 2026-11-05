
const BACKEND = 'https://desktop-l75n630.tail9a2dcb.ts.net';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
            const target = new URL(BACKEND);
            target.pathname = url.pathname.replace(/^\/api/, '') || '/';
            target.search = url.search;

            try {
                const response = await fetch(target.toString(), {
                    method: request.method,
                    headers: request.headers,
                    redirect: 'manual',
                });

                const body = await response.text();

                return new Response(body, {
                    status: response.status,
                    headers: {
                        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
                        'X-Debug-Backend': target.toString(),
                    },
                });
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
