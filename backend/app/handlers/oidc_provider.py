import base64
import hashlib
import hmac
import time
from enum import StrEnum
from typing import Literal, Optional

import cryptography.hazmat.primitives.asymmetric.padding
import cryptography.hazmat.primitives.asymmetric.rsa
import cryptography.hazmat.primitives.hashes
import cryptography.hazmat.primitives.serialization
import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef
from pydantic import BaseModel

from ..utils import b64_json_bytes

routes = RouteTableDef()

# Configs needed, to change behaviour of this IdP (encode this in auth URL):
# - Include scope in token response, or not. Some, like Cognito, don't include it.
# - The username field name. Default to `email`.
# - The JWT algorithm to use. Default to `RS256`. Other options: `HS256`.
# - The "expires_in" value from access token.

JWT_HS256_KEY = b"The books that the world calls immoral are books that show the world its own shame.| You will always be fond of me. I represent to you all the sins you never had the courage to commit.| Experience is merely the name men gave to their mistakes. -Oscar Wilde"
assert len(JWT_HS256_KEY) == 256

# RS256 key generated with:
# key = cryptography.hazmat.primitives.asymmetric.rsa.generate_private_key(public_exponent=65537, key_size=2048)
# print(key.private_bytes(encoding=cryptography.hazmat.primitives.serialization.Encoding.PEM, format=cryptography.hazmat.primitives.serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=cryptography.hazmat.primitives.serialization.NoEncryption()))
# noinspection SpellCheckingInspection
JWT_RS256_KEY: cryptography.hazmat.primitives.asymmetric.rsa.RSAPrivateKey = cryptography.hazmat.primitives.serialization.load_pem_private_key(
    b"""
    -----BEGIN RSA PRIVATE KEY-----
    MIIEogIBAAKCAQEAvUIy52Tr1Dk4HiSmZgnwF/wMR9qqIMzhAEVQEISyEmOOWnxS
    dod77dR2bf7Jmtqf7eGHQmCh/9SHHoJNyAfZxJLBGYm2xIKd5o1sWs7YWmo1CSf0
    Xv7mLfIvW3t1hMcTWc4w3Pc8bAPram3yPHkj2gRI+aMgeROjmvDtCkvyCycNvdPv
    Bli8pNW8PCXWvY+WpJCQoe0l7WITKGAPpKZZUfgT2mKdqkg7ix6MStLyt2XvJ573
    vKkRzFlHGchqikWMFHgJInme2j/U2cQFEPUhWUDA7SRvzxJ3nPUkVO53n3BRolLj
    qzOr8hrGoKHoZKIzlxY3eA5zIeVSGIKQ1W9c8QIDAQABAoIBAAiL5j+Ty6CESvf1
    gLwn47s5ixZtlfQwPFLmTmTIkUAKVeHZLmIi4SJOz2BNOq5vA/zai+Cf+4DRiJ6E
    lN2dGSTq2aR9Fw9NtLK2HTgGkjeXBzkYIE1v5lYZ0zCm5RovYTzTdlpsIcLg9G8U
    cvVvJQLR4bfAOZWuINu82H94CYCeWWy92InvefXS6cK40P4cLfzCYnW4a2KuOZVD
    DPKtjIEMTGpXvApEiG5cC2LWR0RFr2sjSSrniV8WrcZ6vitsR4onWE/Gi52TeHMu
    ZOG2oxE949r0ZhExLYS0h8k7JjlovF7+utpdtsyKkMfZuRMTTKKf4yucxTu0zty7
    E9mdIU8CgYEAy9r+ap2hWPD6+x06XDjlea7oip2roopcw90L4gnd/cW4Qij47+zI
    xALq1diVEf7ABH9/XRDKj3mZbcX7zuL8Se9Ftcb4mMEELjiuz3ITH2nvc4kVXTen
    WWsY5b8PB06lFO8jppUNj/c62oOlS0h2x4JyczQ2IU4+s/VH8eB1WT8CgYEA7atd
    CknVi0tJH1ofiJ/PmlkkyEn8eegBsngJz/KJzTOwcltJugXvr1Wk6971mOCzyJcx
    32xcFbXVAp4wSaLV9KVmtHzcz5elnMxYzfunVeUHE3LUHsfAWLkOrOUdCAiRpXne
    ap784JMr7c6o4xtb2DatCj6S1FDQenPabLn8Dc8CgYAdeCEDRJpIgz2lA4qmPkte
    Fdzj/PsM2jei0Neg65A92VFTrxydgntbapiMJW0XVt5nSA8fYwgFSazWY6KNO98A
    ySgoqQTTAEQccnFC59i/186Xwx9lhGAa2xKUU9RWWBYhOpjKwg1d3H2TjSheA7G4
    EbF92fRhSDBkT3cBDlOofQKBgAw6gPMCkYY1PXHrhSvWbSwX4hicFe1/znaMTpTw
    eb6hJjb8E3MK0yZGVdH9Cs3u4dE0VlCUlrhXPrp/wSRIyJFp4TrwIbxcpRzINtmC
    VT3KJu8NPXTH+lGWU/b5YuEC79t/xb3eqEw1xlDaDT6CLduWFJkuVwetkMx8IYTu
    nNVpAoGAcwFO/ikkiKWqDg8eI9jEzQUwObjgmx48wZfgIO4oQ6MxHfLaGS+6CwGU
    4B0zs4Mu9Lavk3vzRLibVtfBQy8wELFaLAMPtih5MOm1RarKt5tMKh9bH5AxHIw1
    wndIk/sOHwBH1l4ZRKNtkKj1erTjbbNQ6c+nKiFh9gGPTpSI3II=
    -----END RSA PRIVATE KEY-----
    """.replace(
        b"    ", b""
    ),
    password=None,
)


class CodeData(BaseModel):
    aud: str
    scope: str
    nonce: str
    name: Optional[str]
    email: Optional[str]


class AuthorizePostForm(BaseModel):
    redirect_uri: str
    client_id: str
    scope: str
    state: str
    nonce: str
    choice: str
    audience: Optional[str]
    name: Optional[str]
    email: Optional[str]


@routes.post("/oidc/authorize-submit")
async def authorize(request: web.Request):
    body = AuthorizePostForm(**(await request.post()))

    if not body.redirect_uri.startswith(("http://", "https://")):
        raise web.HTTPBadRequest(reason="redirect_uri must be absolute")

    code_data: CodeData = CodeData(
        aud=body.client_id,  # Appsmith auth fails, if we pass `body.audience` here, instead of the `client_id`.
        scope=body.scope,
        nonce=body.nonce,
        name=body.name,
        email=body.email.split("@")[0] + "@example.com",
    )

    params = {
        "code": b64_json_bytes(code_data.dict()).decode("ascii"),
        "scope": body.scope,
        "state": body.state,
    }

    raise web.HTTPFound(yarl.URL(body.redirect_uri).with_query(params))


class GrantType(StrEnum):
    authorization_code = "authorization_code"
    refresh_token = "refresh_token"


class TokenPostForm(BaseModel):
    grant_type: GrantType
    code: Optional[str]
    redirect_uri: Optional[str]
    refresh_token: Optional[str]
    scope: Optional[str]


@routes.post("/oidc/token")
async def submit(request: web.Request) -> web.Response:
    body = TokenPostForm(**(await request.post()))

    code_data: CodeData = CodeData.parse_raw(
        base64.urlsafe_b64decode(body.code if body.grant_type == GrantType.authorization_code else body.refresh_token)
    )

    # The `sub` here should match the one in `userinfo` endpoint.
    return web.json_response(
        {
            "id_token": make_jwt(
                "RS256",
                aud=code_data.aud,
                nonce=code_data.nonce,
                sub="fake user",
                email=code_data.email,
            ).decode(),
            "access_token": b64_json_bytes(
                {
                    "sub": "fake user",
                    "name": code_data.name,
                    "email": code_data.email,
                }
            ).decode(),
            "scope": code_data.scope,
            "token_type": "Bearer",
            "refresh_token": body.refresh_token or body.code,
            "expires_in": 3600,
        }
    )


@routes.get("/oidc/userinfo")
async def userinfo(request: web.Request) -> web.Response:
    # This `token` will be the access_token, sent in the token endpoint.
    token = request.headers.get("Authorization", "").split(None, 1)[1]
    return web.Response(body=base64.urlsafe_b64decode(token).decode(), content_type="application/json")


@routes.get("/oidc/jwks")
async def jwks(_: web.Request) -> web.Response:
    public_numbers = JWT_RS256_KEY.public_key().public_numbers()
    return web.json_response(
        {
            "keys": [
                {
                    "kty": "RSA",
                    "alg": "RS256",
                    "use": "sig",
                    "n": int_to_base64(public_numbers.n).decode(),
                    "e": int_to_base64(public_numbers.e).decode(),
                },
            ],
        }
    )


def int_to_base64(n):
    return base64.urlsafe_b64encode(n.to_bytes(length=(n.bit_length() + 7) // 8, byteorder="big"))


def make_jwt(alg: Literal["HS256", "RS256"], **kwargs: str) -> bytes:
    # Ref: <https://www.rfc-editor.org/rfc/rfc7518#section-3>.
    # For HS256, signature verification needs the secret key. For RS256, it needs the public key.
    # So for HS256, the signature can be any string, since verification can't be done anyway.
    # This is, of course, not a real JWT. Just a fake one.
    # print("alg annotations:", alg.__annotations__)
    if alg not in {"HS256", "RS256"}:
        raise ValueError(f"Unsupported alg: {alg}")

    header = b64_json_bytes(
        {
            "alg": alg,
            "typ": "JWT",
        }
    ).rstrip(b"=")

    payload = b64_json_bytes(
        {
            "iss": "https://littletools.app",  # Issuer
            "exp": 9999999999,  # Expiration time
            "iat": int(time.time()),  # Issued At
            **kwargs,
        }
    ).rstrip(b"=")

    body = header + b"." + payload
    signature = None

    if alg == "HS256":
        signature = hmac.new(JWT_HS256_KEY, body, hashlib.sha256).digest()

    elif alg == "RS256":
        signature = JWT_RS256_KEY.sign(
            body,
            padding=cryptography.hazmat.primitives.asymmetric.padding.PKCS1v15(),
            algorithm=cryptography.hazmat.primitives.hashes.SHA256(),
        )

    return body + b"." + base64.urlsafe_b64encode(signature).rstrip(b"=")
