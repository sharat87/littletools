import aiohttp
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

routes = RouteTableDef()


@routes.get("/csp")
async def csp_view(request: web.Request) -> web.Response:
    url = request.query.get("url")

    if not url or not isinstance(url, str):
        return web.json_response({
            "ok": False,
            "error": "url is required",
        }, status=400)

    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            csp = response.headers.get("content-security-policy")
            if csp:
                return web.json_response({
                    "ok": True,
                    "values": csp if isinstance(csp, list) else [csp],
                })

    return web.json_response({
        "ok": True,
        "error": "no csp",
    })
