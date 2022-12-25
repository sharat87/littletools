import traceback

import pydantic
from aiohttp import web


@web.middleware
async def error_handler(request: web.Request, handler):
    try:
        return await handler(request)
    except pydantic.ValidationError as error:
        traceback.print_exception(error)
        return web.json_response({
            "ok": False,
            "errors": error.json(),
        }, status=400)
