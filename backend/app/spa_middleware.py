from aiohttp import web


def with_html(body: bytes):
    @web.middleware
    async def spa_middleware(request: web.Request, handler):
        return (
            await handler(request)
            if request.path.startswith("/x/")
            else web.Response(body=body, content_type="text/html")
        )

    return spa_middleware
