import base64
import sys
import textwrap
from pathlib import Path
from xml.etree import ElementTree

import attr
import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

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


@routes.get("/saml/metadata")
async def saml_metadata(request: web.Request):
    host, scheme = get_host_scheme(request)

    client_id = "dummy"

    # Service provider redirects to this URL to start the login process.
    login_post = f"{scheme}://{host}/x/saml/login-post/{client_id}"

    login_redirect = f"{scheme}://{host}/x/saml/login-redirect/{client_id}"

    logout_post = f"{scheme}://{host}/x/saml/logout-post/{client_id}"

    logout_redirect = f"{scheme}://{host}/x/saml/logout-redirect/{client_id}"

    body = textwrap.dedent(
        f"""\
    <?xml version="1.0" encoding="UTF-8"?>
    <EntityDescriptor entityID="urn:{host}" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
      <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <KeyDescriptor use="signing">
          <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
            <X509Data>
              <X509Certificate>{cert_pem}</X509Certificate>
            </X509Data>
          </KeyInfo>
        </KeyDescriptor>
        <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="{logout_redirect}"/>
        <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{logout_post}"/>
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
        <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
        <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</NameIDFormat>
        <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="{login_redirect}"/>
        <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{login_post}"/>
        <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Name ID" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
        <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="E-Mail Address" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
        <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Name" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
        <Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Given Name" xmlns="urn:oasis:names:tc:SAML:2.0:assertion"/>
      </IDPSSODescriptor>
    </EntityDescriptor>
    """
    )

    return web.Response(body=body, content_type="text/xml")


@attr.define
class SamlAuthRequest:
    id: str
    destination: str
    issuer: str
    sp_endpoint: str


@routes.post("/saml/login-post/{client_id}")
async def login_post_view(request: web.Request):
    # This will be a `application/x-www-form-urlencoded` request with two fields, `SAMLRequest` and `RelayState`.
    data = await request.post()

    host, scheme = get_host_scheme(request)

    auth_request = parse_saml_request(data["SAMLRequest"])

    idp_issuer = f"urn:{host}"

    params = {
        "requestId": auth_request.id,
        "spIssuer": auth_request.issuer,
        "idpIssuer": idp_issuer,
        "spEndpoint": auth_request.sp_endpoint,
        "relayState": data.get("RelayState") or "",
    }

    raise web.HTTPFound(yarl.URL("/saml-provider-authorize").with_query(params))


def parse_saml_request(auth_request: str) -> SamlAuthRequest:
    saml_request = base64.b64decode(auth_request)

    root = ElementTree.fromstring(saml_request)

    namespaces = {"saml": "urn:oasis:names:tc:SAML:2.0:assertion"}
    issuer = root.find("./saml:Issuer", namespaces=namespaces).text

    return SamlAuthRequest(
        id=root.attrib["ID"],
        destination=root.attrib["Destination"],
        issuer=issuer,
        sp_endpoint=root.attrib["AssertionConsumerServiceURL"],
    )
