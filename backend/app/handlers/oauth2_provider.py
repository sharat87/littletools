import urllib.parse
from dataclasses import dataclass
from typing import Optional

import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

from ..utils import b64_json

routes = RouteTableDef()


# TODO: Handle POST also, where params are read from the body.
@dataclass
class OAuth2ProviderAuthorizeQuery:
    redirect_uri: str
    response_type: str
    client_id: Optional[str]
    state: str
    scope: str


@routes.get("/oauth2-provider-authorize")
async def authorize(request: web.Request) -> web.Response:
    config = OAuth2ProviderAuthorizeQuery(**request.query)

    # Ref: <https://datatracker.ietf.org/doc/html/rfc6749>.
    if not config.redirect_uri.startswith(("http://", "https://")):
        return web.Response(body="Invalid redirect_uri", status=400)

    if config.response_type in {"code", "token"} and not config.client_id:
        return web.Response(body="Invalid client_id", status=400)

    scopes = config.scope.split()

    # TODO: Error handling as per <https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2.1>.
    consent_info = {
        "redirect_uri": config.redirect_uri,
        "response_type": config.response_type,
        "state": config.state,
        "scopes": scopes,
    }

    redirect_uri = yarl.URL(config.redirect_uri)
    raise web.HTTPFound(
        urllib.parse.urlunsplit(
            (
                redirect_uri.scheme,
                redirect_uri.host,
                "/oauth2-provider-consent",
                b64_json(consent_info),
                "",
            )
        )
    )


@dataclass
class OAuth2ProviderAuthorizeSubmitForm:
    decision: str
    redirect_uri: str
    response_type: str
    state: str
    scope: str


@routes.post("/oauth2-provider-authorize/submit")
async def submit(request: web.Request):
    # TODO: Error out if there's *any* query params here.

    config = OAuth2ProviderAuthorizeSubmitForm(**(await request.post()))

    redirect_params = {}

    if config.state:
        redirect_params["state"] = config.state

    if config.scope:
        redirect_params["scope"] = config.scope

    if config.decision == "allow":
        if config.response_type == "code":
            redirect_params["code"] = "123"
        elif config.response_type == "token":
            redirect_params.update(access_token="456", token_type="bearer")
        else:
            redirect_params["approved"] = "true"
    else:
        redirect_params["error"] = "access_denied"

    redirect_uri = yarl.URL(config.redirect_uri)
    raise web.HTTPFound(
        urllib.parse.urlunsplit(
            (
                redirect_uri.scheme,
                redirect_uri.host,
                redirect_uri.path,
                urllib.parse.urlencode(redirect_params),
                "",
            )
        )
    )
