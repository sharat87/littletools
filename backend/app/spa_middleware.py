from aiohttp import web


def with_html(body: bytes):
    body_response = web.Response(body=body, content_type="text/html")

    @web.middleware
    async def spa_middleware(request: web.Request, handler):
        return await handler(request) if request.path.startswith("/x/") else body_response

    return spa_middleware
