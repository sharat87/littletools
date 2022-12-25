from aiohttp import web


def with_html(body: bytes):
    @web.middleware
    async def spa_middleware(request: web.Request, handler):
        if request.path == "/":
            return web.Response(body=body, content_type="text/html")

        try:
            response = await handler(request)
        except web.HTTPNotFound:
            return web.Response(body=body, content_type="text/html")

        return response

    return spa_middleware
