import base64
import datetime
import json
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
        "state": b64_json(
            {
                "state": config.state,
                "authorizeURL": config.authorize_url,
                "tokenURL": config.token_url,
                "clientID": config.client_id,
                "clientSecret": config.client_secret,
                "redirectURI": config.redirect_uri,
            }
        ),
    }

    auth_url = yarl.URL(config.authorize_url)
    raise web.HTTPFound(auth_url.with_query(params).with_fragment(None))


@dataclass
class OAuth2ClientVerifyQuery:
    code: str
    state: str


@routes.get("/oauth2-client-verify")
async def verify_flow(request: web.Request):
    # TODO: The query has more stuff, with some providers, like `scope` sometimes, and `session_state` with Keycloak as IdP, etc. Collect them and show in the result UI.
    config = OAuth2ClientVerifyQuery(code=request.query["code"], state=request.query["state"])

    state = json.loads(base64.urlsafe_b64decode(config.state.encode()).decode())

    token_url = yarl.URL(state["tokenURL"])

    async with aiohttp.ClientSession() as session:
        # TODO: Check for SSRF here.
        async with session.post(
            token_url.with_query(None).with_fragment(None),
            params={
                "grant_type": "authorization",
                "code": config.code,
                "redirect_uri": state["redirectURI"],
                "client_id": state["clientID"],
                "client_secret": state["clientSecret"],
            },
        ) as response:
            token_response_content_type = (
                response.headers.get("content-type", "").split(";")[0].strip()
            )
            token_response_body = await (
                response.json()
                if token_response_content_type == "application/json"
                else response.text()
            )

    auth_response_data = dict(request.query)
    del auth_response_data["state"]

    result = {
        "time": datetime.datetime.utcnow().isoformat(),
        "authorizeResponse": auth_response_data,
        "tokenResponse": {
            "body": token_response_body,
            "contentType": token_response_content_type,
        },
        "state": state["state"],
    }

    raise web.HTTPFound(request.url.with_path("/oauth2-result").with_query(b64_json(result)).with_fragment(None))
