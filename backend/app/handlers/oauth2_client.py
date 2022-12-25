import base64
import datetime
import json
import urllib.parse
from dataclasses import dataclass

import aiohttp
import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

from ..utils import b64_json

routes = RouteTableDef()


@dataclass
class OAuth2ClientStartQuery:
    authorize_url: str
    client_id: str
    client_secret: str
    redirect_uri: str
    scope: str
    token_url: str
    state: str = ""


@routes.post("/oauth2-client-start")
async def start_flow(request: web.Request):
    config = OAuth2ClientStartQuery(**(await request.post()))

    params = {
        "response_type": "code",
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "scope": config.scope,
        "state": b64_json({
            "state": config.state,
            "authorizeURL": config.authorize_url,
            "tokenURL": config.token_url,
            "clientID": config.client_id,
            "clientSecret": config.client_secret,
            "redirectURI": config.redirect_uri,
        }),
    }

    authorize_url = yarl.URL(config.authorize_url)
    raise web.HTTPFound(urllib.parse.urlunsplit((authorize_url.scheme, authorize_url.host, authorize_url.path, urllib.parse.urlencode(params, encoding="utf-8"), "")))


@dataclass
class OAuth2ClientVerifyQuery:
    code: str
    state: str
    scope: str = ""


@routes.get("/oauth2-client-verify")
async def verify_flow(request: web.Request):
    config = OAuth2ClientVerifyQuery(**request.query)

    state = json.loads(base64.urlsafe_b64decode(config.state.encode()).decode())

    token_url = yarl.URL(state["tokenURL"])

    async with aiohttp.ClientSession() as session:
        # TODO: Check for SSRF here.
        async with session.post(
            urllib.parse.urlunsplit((token_url.scheme, token_url.host, token_url.path, "", "")),
            params={
                "grant_type": "authorization",
                "code": config.code,
                "redirect_uri": state["redirectURI"],
                "client_id": state["clientID"],
                "client_secret": state["clientSecret"],
            },
        ) as response:
            token_response_content_type = response.headers.get("content-type", "").split(";")[0].strip()
            token_response_body = await (response.json() if token_response_content_type == "application/json" else response.text())

    result = {
        "time": datetime.datetime.utcnow().isoformat(),
        "authorizeResponse": {
            "code": config.code,
            "scope": config.scope,
        },
        "tokenResponse": {
            "body": token_response_body,
            "contentType": token_response_content_type,
        },
        "state": state["state"],
    }

    raise web.HTTPFound(urllib.parse.urlunsplit((request.url.scheme, request.url.host, "/oauth2-result", b64_json(result), "")))
