from aiohttp import web


def with_html(body: bytes):
    @web.middleware
    async def spa_middleware(request: web.Request, handler):
        if request.path == "/":
            return web.Response(body=body, content_type="text/html")

        try:
            return await handler(request)
        except web.HTTPNotFound:
            if request.path.startswith("/x/"):
                raise
            return web.Response(body=body, content_type="text/html")

    return spa_middleware
