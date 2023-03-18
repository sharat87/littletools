import base64
import datetime
import json
import secrets
import sys
import zlib
from pathlib import Path
from xml.etree import ElementTree

import attr
import jinja2
import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

from .. import utils

routes = RouteTableDef()

try:
    cert_pem = Path("../saml-cert.pem").read_text()
except FileNotFoundError:
    print("SAML cert not found, using dummy cert.", flush=True, file=sys.stderr)
    cert_pem = "unavailable"


def get_host_scheme(request: web.Request):
    host = request.host or "littletools.app"
    host = host.replace("host.docker.internal", "localhost")

    scheme = "http" if "localhost" in host else "https"

    return host, scheme


@attr.define
class MetadataConfig:
    sso: str = "gp"
    slo: str = "gp"
    relayState: str = "forward"


def parse_metadata_config(config_raw: str):
    return (
        MetadataConfig(**json.loads(base64.b64decode(config_raw)))
        if config_raw
        else MetadataConfig()
    )


@routes.get("/saml/metadata/{config}")
async def saml_metadata(request: web.Request):
    config_raw = request.match_info.get("config", "")
    config = parse_metadata_config(config_raw)

    host, scheme = get_host_scheme(request)

    # Service provider redirects to this URL to start the login process.
    login_binding = f"{scheme}://{host}/x/saml/login/{config_raw}"
    logout_binding = f"{scheme}://{host}/x/saml/logout/{config_raw}"

    attributes = {
        "nameidentifier": "Name ID",
        "emailaddress": "E-Mail Address",
        "name": "Name",
        "givenname": "Given Name",
    }

    body = (
        await request.config_dict["jinja2_env"]
        .get_template("saml-idp/metadata.xml.jinja2")
        .render_async(
            idp_issuer=f"urn:{host}",
            cert_pem=cert_pem,
            config=config,
            login_binding=login_binding,
            logout_binding=logout_binding,
            attributes=attributes,
        )
    )

    return web.Response(body=body, content_type="text/xml")


@attr.define
class SamlAuthRequest:
    id: str
    destination: str
    issuer: str
    sp_endpoint: str


@routes.get("/saml/login/{config_raw}")
@routes.post("/saml/login/{config_raw}")
async def login_view(request: web.Request):
    config = parse_metadata_config(request.match_info.get("config", ""))

    if request.method == "POST":
        if "p" not in config.sso:
            raise web.HTTPBadRequest(reason="POST binding not allowed")

        # This will be a `application/x-www-form-urlencoded` request with two fields, `SAMLRequest` and `RelayState`.
        data = await request.post()
        auth_request = parse_saml_auth_request(base64.b64decode(data["SAMLRequest"]))

    else:
        if "g" not in config.sso:
            raise web.HTTPBadRequest(reason="GET binding not allowed")

        # query param -> base64 decode -> decompress -> parse
        data = request.query
        auth_request = parse_saml_auth_request(
            zlib.decompress(base64.b64decode(data["SAMLRequest"]), -15)
        )

    host, _ = get_host_scheme(request)
    idp_issuer = f"urn:{host}"

    session_index: str = utils.pack(
        sp_endpoint=auth_request.sp_endpoint,
    ).decode("ascii")

    if config.relayState == "forward":
        relay_state = data.get("RelayState", "")
    elif config.relayState == "drop":
        relay_state = ""
    elif config.relayState == "mangle":
        relay_state = "deliberately-incorrect-value"
    else:
        raise web.HTTPBadRequest(reason=f"Unknown relayState: {config.relayState}")

    params: dict[str, str] = {
        "method": request.method.upper(),
        "requestId": auth_request.id,
        "spIssuer": auth_request.issuer,
        "idpIssuer": idp_issuer,
        "spEndpoint": auth_request.sp_endpoint,
        "relayState": relay_state,
        "sessionIndex": session_index,
    }

    raise web.HTTPFound(yarl.URL("/saml-provider-authorize").with_query(params))


@attr.define
class MakeResponsePayload:
    compress: bool
    requestId: str
    spIssuer: str
    spEndpoint: str
    sessionIndex: str

    name: str
    email: str


@routes.post("/saml/make-response")
async def make_response_view(request: web.Request):
    payload = MakeResponsePayload(**(await request.json()))

    host, _ = get_host_scheme(request)

    jinja_env: jinja2.Environment = request.config_dict["jinja2_env"]

    now = datetime.datetime.utcnow()
    assertion_id = secrets.token_urlsafe(32)

    response_xml = await jinja_env.get_template(
        "saml-idp/login-response.xml.jinja2",
    ).render_async(
        now=now.isoformat() + "Z",
        response_id=secrets.token_urlsafe(32),
        sp_endpoint=payload.spEndpoint,
        request_id=payload.requestId,
        idp_issuer=f"urn:{host}",
        assertion_id=assertion_id,
        email=utils.safe_email_domain(payload.email),
        name=payload.name,
        expiry=(now + datetime.timedelta(days=90)).isoformat() + "Z",
        sp_issuer=payload.spIssuer,
        session_index=payload.sessionIndex,
    )

    saml_response: bytes = response_xml.encode("utf-8")

    """Alternate AttributeStatement for testing purposes
    <AttributeStatement xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <Attribute Name="immutableID" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <AttributeValue xsi:type="xs:string">wdo43694</AttributeValue>
      </Attribute>
      <Attribute Name="corporatenetwork" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <AttributeValue xsi:type="xs:string">True</AttributeValue>
      </Attribute>
      <Attribute Name="givenname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <AttributeValue xsi:type="xs:string">William</AttributeValue>
      </Attribute>
      <Attribute Name="surname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <AttributeValue xsi:type="xs:string">O'Shea</AttributeValue>
      </Attribute>
      <Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
        <AttributeValue xsi:type="xs:string">bill.d.o'shea@gsk.com</AttributeValue>
      </Attribute>
    </AttributeStatement>
    """

    if payload.compress:
        saml_response = zlib.compress(saml_response, wbits=-15)

    return utils.json_response(
        {
            "samlResponse": base64.b64encode(saml_response).decode("utf-8"),
        }
    )


# Handle logout request sent by the service provider.
def parse_saml_auth_request(data: bytes) -> SamlAuthRequest:
    root = ElementTree.fromstring(data)

    namespaces = {"saml": "urn:oasis:names:tc:SAML:2.0:assertion"}
    issuer = root.find("./saml:Issuer", namespaces=namespaces).text

    return SamlAuthRequest(
        id=root.attrib["ID"],
        destination=root.attrib["Destination"],
        issuer=issuer,
        sp_endpoint=root.attrib["AssertionConsumerServiceURL"],
    )


@attr.define
class SamlLogoutRequest:
    id: str
    destination: str
    issuer: str
    session_index: str


@routes.get("/saml/logout/{config}")
@routes.post("/saml/logout/{config}")
async def logout_post_view(request: web.Request):
    # Ideally, if we were a real IdP, we'd send logout requests to any other SPs that the user is logged into.
    # But for us, we need a way to define SP groups and then send logout requests to all SPs in a group.
    # Described in <https://www.identityserver.com/articles/the-challenge-of-building-saml-single-logout>.

    config = parse_metadata_config(request.match_info.get("config", ""))

    if request.method == "POST":
        if "p" not in config.slo:
            raise web.HTTPBadRequest(reason="POST binding not allowed")

        # This will be a `application/x-www-form-urlencoded` request with two fields, `SAMLRequest` and `RelayState`.
        data = await request.post()
        saml_request = parse_saml_logout_request(base64.b64decode(data["SAMLRequest"]))

    else:
        if "g" not in config.slo:
            raise web.HTTPBadRequest(reason="GET binding not allowed")

        # query param -> base64 decode -> decompress -> parse
        data = request.query
        saml_request = parse_saml_logout_request(
            zlib.decompress(base64.b64decode(data["SAMLRequest"]), -15)
        )

    # There's a `saml:NameID` element in the SAML request that contains the user's email address.
    sp_endpoint = utils.unpack(saml_request.session_index)["sp_endpoint"]

    host, _ = get_host_scheme(request)

    jinja_env: jinja2.Environment = request.config_dict["jinja2_env"]

    body: bytes = (
        await jinja_env.get_template(
            "saml-idp/logout-response.xml.jinja2"
        ).render_async(
            now=datetime.datetime.utcnow().isoformat() + "Z",
            response_id=secrets.token_urlsafe(32),
            sp_endpoint=sp_endpoint,
            request_id=saml_request.id,
            idp_issuer=f"urn:{host}",
        )
    ).encode("utf-8")

    use_binding = "p" if "p" in config.slo else "g"

    if use_binding == "d":
        body = zlib.compress(body, wbits=-15)

    saml_response_content: str = base64.b64encode(body).decode()

    if config.relayState == "forward":
        relay_state = data.get("RelayState")
    elif config.relayState == "drop":
        relay_state = None
    elif config.relayState == "mangle":
        relay_state = "deliberately-incorrect-value"
    else:
        raise web.HTTPBadRequest(reason="Invalid relayState config")

    if use_binding == "d":
        raise web.HTTPFound(
            yarl.URL(sp_endpoint).with_query(
                SAMLResponse=saml_response_content, RelayState=relay_state
            ),
        )

    return web.Response(
        body=await jinja_env.get_template(
            "saml-idp/logout-auto-form.html.jinja2"
        ).render_async(
            action=sp_endpoint,
            saml_response=saml_response_content,
            relay_state=relay_state,
        ),
        content_type="text/html",
    )


def parse_saml_logout_request(body: bytes) -> SamlLogoutRequest:
    root = ElementTree.fromstring(body)

    namespaces = {
        "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
        "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
    }
    issuer = root.find("./saml:Issuer", namespaces=namespaces).text

    return SamlLogoutRequest(
        id=root.attrib["ID"],
        destination=root.attrib["Destination"],
        issuer=issuer,
        session_index=root.find("./samlp:SessionIndex", namespaces=namespaces).text,
    )
