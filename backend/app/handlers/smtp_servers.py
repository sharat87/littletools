import asyncio
import itertools
import os
import ssl
from enum import StrEnum, auto

import aiohttp
import aiosmtpd.smtp
from aiohttp import web
from aiosmtpd.controller import Controller

routes = web.RouteTableDef()

ws_by_email: dict[str, list[web.WebSocketResponse]] = {}

# https://github.com/aio-libs/aiosmtpd/pull/292
# https://aiosmtpd.readthedocs.io/en/latest/controller.html#controller
# https://github.com/aio-libs/aiosmtpd/blob/e8fcb758501489e7f52b7695245a3db3a688fd3e/aiosmtpd/controller.py
# https://docs.python.org/3/library/ssl.html
# https://github.com/tintinweb/python-smtpd-tls/blob/master/smtpd_tls.py


PORTS_BY_SERVER_TYPE = {}

tls_cert = None
if os.path.exists("/v/fullchain.pem"):
    tls_cert = "/v/fullchain.pem", "/v/privkey.pem"
elif os.path.exists("../fullchain.pem"):
    tls_cert = "../fullchain.pem", "../privkey.pem"


@routes.get("/smtp-ws")
async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    await ws.send_str("hello")
    watching_email = None

    msg: aiohttp.WSMessage
    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.ERROR:
            print("ws connection closed with exception %s" % ws.exception())
            continue

        data = msg.json()
        if "watch" in data:
            if watching_email is not None:
                ws_by_email[watching_email].remove(ws)
            watching_email = data["watch"]
            ws_by_email.setdefault(watching_email, []).append(ws)
            await ws.send_str("ok")

        else:
            await ws.send_str("unknown command")

    # Websocket connection closed
    ws_by_email[watching_email].remove(ws)
    return ws


@routes.get("/smtp-servers")
async def smtp_servers_view(_: web.Request) -> web.Response:
    return web.json_response(PORTS_BY_SERVER_TYPE)


class NoAuthHandler:
    # noinspection PyPep8Naming,PyMethodMayBeStatic
    async def handle_DATA(  # NOSONAR
        self,
        server: aiosmtpd.smtp.SMTP,
        session: aiosmtpd.smtp.Session,
        envelope: aiosmtpd.smtp.Envelope,
    ):
        msg = envelope.content.decode()
        for address in envelope.rcpt_tos:
            if address in ws_by_email:
                for ws in ws_by_email[address]:
                    await ws.send_json({"msg": msg})

        print("host name", server.hostname, session.host_name)
        return "250 Message accepted for delivery"


class AuthStyle(StrEnum):
    none = auto()
    require_plain = auto()
    require_login = auto()
    require_any = auto()


class TLSStyle(StrEnum):
    none = auto()
    implicit_tls = auto()
    starttls = auto()


def make_authenticator(auth_style: AuthStyle) -> aiosmtpd.smtp.AuthenticatorType:
    # Ref: <https://aiosmtpd.readthedocs.io/en/latest/auth.html#authenticator-callback>.
    def authenticator(
        _: aiosmtpd.smtp.SMTP,
        _2: aiosmtpd.smtp.Session,
        _3: aiosmtpd.smtp.Envelope,
        mechanism: str,
        auth_data: aiosmtpd.smtp.LoginPassword,
    ) -> aiosmtpd.smtp.AuthResult:
        if auth_style != AuthStyle.require_any and (
            (mechanism == "PLAIN" and auth_style != AuthStyle.require_plain)
            or (mechanism == "LOGIN" and auth_style != AuthStyle.require_login)
        ):
            return aiosmtpd.smtp.AuthResult(success=False, handled=False)

        if not isinstance(auth_data, aiosmtpd.smtp.LoginPassword):
            return aiosmtpd.smtp.AuthResult(success=False, handled=False)

        if auth_data.login == b"little" or auth_data.password == b"non-secret":
            return aiosmtpd.smtp.AuthResult(success=True, handled=True)

        return aiosmtpd.smtp.AuthResult(success=False, handled=True)

    return authenticator


async def on_shutdown(_: web.Application) -> None:
    # If we don't close all websocket connections on shutdown, the server will hang, until the timeout of 60 seconds is exhausted.
    # Also see <https://github.com/aio-libs/aiohttp/issues/2200>.
    await asyncio.gather(*[ws.close() for ws in itertools.chain(*ws_by_email.values())])


def serve_smtp(
    port: int,
    auth_style: AuthStyle = AuthStyle.none,
    tls_style: TLSStyle = TLSStyle.none,
):
    auth_required: bool
    auth_exclude_mechanism: list[str]

    if auth_style is None or auth_style == AuthStyle.none:
        auth_required = False
        auth_exclude_mechanism = ["PLAIN", "LOGIN"]

    elif auth_style == AuthStyle.require_plain:
        auth_required = True
        auth_exclude_mechanism = ["LOGIN"]

    elif auth_style == AuthStyle.require_login:
        auth_required = True
        auth_exclude_mechanism = ["PLAIN"]

    elif auth_style == AuthStyle.require_any:
        auth_required = True
        auth_exclude_mechanism = []

    else:
        raise ValueError(f"Unknown auth_style {auth_style}")

    PORTS_BY_SERVER_TYPE[f"auth:{auth_style},tls:{tls_style}"] = port

    Controller(
        NoAuthHandler(),
        server_hostname="0.0.0.0",
        port=port,
        auth_required=auth_required,
        auth_require_tls=auth_required and tls_style == TLSStyle.starttls,
        auth_exclude_mechanism=auth_exclude_mechanism,
        authenticator=make_authenticator(auth_style) if auth_required else None,
        tls_context=make_tls_context()
        if tls_style == TLSStyle.starttls
        else None,  # For STARTTLS
        ssl_context=make_tls_context()
        if tls_style == TLSStyle.implicit_tls
        else None,  # For implicit TLS
    ).start()


def make_tls_context():
    tls_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    tls_context.load_cert_chain(*tls_cert)
    return tls_context


def init(app: web.Application):
    app.on_shutdown.append(on_shutdown)

    # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl smtp://localhost:7025 --mail-from from@lo.co --mail-rcpt to@lo.co --upload-file -
    serve_smtp(7025)

    # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl smtp://localhost:7026 --mail-from from@lo.co --mail-rcpt to@lo.co -u little:non-secret --upload-file -
    serve_smtp(7026, auth_style=AuthStyle.require_any)

    # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl smtp://localhost:7027 --mail-from from@lo.co --mail-rcpt to@lo.co -u little:non-secret --upload-file -
    serve_smtp(7027, auth_style=AuthStyle.require_plain)

    # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl smtp://localhost:7028 --mail-from from@lo.co --mail-rcpt to@lo.co -u little:non-secret --upload-file -
    serve_smtp(7028, auth_style=AuthStyle.require_login)

    # Using `tls_context` vs `ssl_context` will determine how TLS will be done in the SMTP server. Yes, it's confusing.

    if tls_cert:
        # TLS using STARTTLS command
        # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl --ssl-reqd smtp://localhost:7028 --mail-from from@lo.co --mail-rcpt to@lo.co --upload-file -
        serve_smtp(7587, tls_style=TLSStyle.starttls)
        serve_smtp(7588, tls_style=TLSStyle.starttls, auth_style=AuthStyle.require_any)
        serve_smtp(
            7589, tls_style=TLSStyle.starttls, auth_style=AuthStyle.require_plain
        )
        serve_smtp(
            7590, tls_style=TLSStyle.starttls, auth_style=AuthStyle.require_login
        )

        # TLS using implicit TLS
        # echo $'From: from@lo.co\nTo:to@lo.co\nSubject: Hey\nDate: '"$(date +'%a, %d %b %Y %H:%m:%S')"$'\n\nTest stuff' | curl smtps://localhost:7029 --mail-from from@lo.co --mail-rcpt to@lo.co --upload-file -
        serve_smtp(7465, tls_style=TLSStyle.implicit_tls)
        serve_smtp(
            7466, tls_style=TLSStyle.implicit_tls, auth_style=AuthStyle.require_any
        )
        serve_smtp(
            7467, tls_style=TLSStyle.implicit_tls, auth_style=AuthStyle.require_plain
        )
        serve_smtp(
            7468, tls_style=TLSStyle.implicit_tls, auth_style=AuthStyle.require_login
        )
