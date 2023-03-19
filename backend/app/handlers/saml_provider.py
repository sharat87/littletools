import base64
import datetime
import hashlib
import json
import secrets
import textwrap
import zlib
from xml.etree import ElementTree

import attr
import jinja2
import yarl
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

from .. import utils

routes = RouteTableDef()

# noinspection SpellCheckingInspection
SAML_CERT_PEM: str = (
    "MIIDgDCCAmigAwIBAgIURa+x81FWqjCUolbL1mzgiCsMGZYwDQYJKoZIhvcNAQELBQAwajELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaW"
    "ExFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xFDASBgNVBAoMC0xpdHRsZVRvb2xzMRgwFgYDVQQDDA9saXR0bGV0b29scy5hcHAwHhcNMjMwMzA1MDU0"
    "MDM2WhcNMjMwNjAzMDU0MDM2WjBqMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzEUMBIGA1"
    "UECgwLTGl0dGxlVG9vbHMxGDAWBgNVBAMMD2xpdHRsZXRvb2xzLmFwcDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALQrmyobgMkfTBGN"
    "dMQ5n2pjc6JcO+qeHYaV0ghKeR+O6AfWDm7t8ibiNbt9ya/zTxHXfiuhQeL1+Jyrwlrqn1gWOrQZXL6zhAoRLDL/Cji91km/KcGgVy9J5rs0ZOQWMm"
    "0zmL5Hv9pd2Q+o919lhPngUjPAAVupNNpI/mUyzNxiCpkWKRR9T+26v/TZKVieOC4SxLwCLNvtQnhuNWdSIzO1l0+BO9Vnbz19m3EelmMjMfRRR+LE"
    "S6+b/dny417txGVhkVH3qUZY9resgELaYJspKwinUmyc+kwISChssa3HcaucGSUuZo1tY1a6HZIdv+w1hfwdud9JAKrmw/6mhCkCAwEAAaMeMBwwGg"
    "YDVR0RBBMwEYIPbGl0dGxldG9vbHMuYXBwMA0GCSqGSIb3DQEBCwUAA4IBAQAmr8rugjg9bjUeLauPszzms0hRgNJ9XH7XbLIlDHi47F182ZkW7XqP"
    "qn5HvrtuEVNHnaFQ9qoQqR2bmsOLxMQpsHK0PEILPZaASXXqCyZMqKAgP/5gwaBcspdhlX9uhz/1BR+02avOH5TtOlJd2vBPDmmpNlExjKDO3j540Y"
    "He1bSa3SzZEfjRtp+dA85oX6ClAXz/AewBN5lIrFeOxxo7JTfcXMg6uuU8z41OQATLaGFBMR10rZRK7bdMyIsxphi20H89a6D530zk8qfsbuf7jiPC"
    "fYRXNoCqdykGnokT9sZDOs07YsAbo1XTKL+9V3WMBtSJ2LaqVqfli7t9Jsws"
)

# noinspection SpellCheckingInspection
SAML_PRIVATE_KEY = serialization.load_pem_private_key(
    textwrap.dedent("""\
    -----BEGIN RSA PRIVATE KEY-----
    MIIEowIBAAKCAQEAtCubKhuAyR9MEY10xDmfamNzolw76p4dhpXSCEp5H47oB9YO
    bu3yJuI1u33Jr/NPEdd+K6FB4vX4nKvCWuqfWBY6tBlcvrOEChEsMv8KOL3WSb8p
    waBXL0nmuzRk5BYybTOYvke/2l3ZD6j3X2WE+eBSM8ABW6k02kj+ZTLM3GIKmRYp
    FH1P7bq/9NkpWJ44LhLEvAIs2+1CeG41Z1IjM7WXT4E71WdvPX2bcR6WYyMx9FFH
    4sRLr5v92fLjXu3EZWGRUfepRlj2t6yAQtpgmykrCKdSbJz6TAhIKGyxrcdxq5wZ
    JS5mjW1jVrodkh2/7DWF/B2530kAqubD/qaEKQIDAQABAoIBAFPntNicu1KunRXV
    iynw7eE1VH4ptwuRvA1Xy1rqF9NPEZbIpKsba/iYw05AC8PBqzKTaSI3dIAWbcPE
    p3wApNl4bLk/0HXNEzI/AhbzuBZprhhlCrSuD7wpjebjxRKFldFORJVkw5+Vsgb9
    eMp39EAMLCwGgHtn5wG7GaIWUNpWkyUYMWofbTzKW/2OjUl7LAhloduJTKCEUA5R
    p/TXqcfVQIpTj2mgg7EsgjXtKqRR0tTWR6NPMT27/i3fS2VT/1hf4aRwzFQ6Lk9G
    wEPCCWqLeAAEXWLF4/1aCv+35q+PC2u5CgC3uwL5W8+QCRo6rCzIwtnLGtsa03AY
    VWi868MCgYEAweFfyJaBTZMUu1ITJ0hzk/PSHju3/673wN8olNrSEc2h9oRHE7de
    ozWFKqPDRsdG5+y3IEwxsmVtD6euzWC3mQWzK+qYhXiWldONuY6XVvL601Z3Rx/E
    q8zfaWHzfqqA3nV86jdzuQ2/7FvHWoQZfFAVQqE4UDZN/PNFa6KgX9MCgYEA7eWy
    Gm89b2xP+lPy3x12KkoMsbbWqZXIK2ePVBb9hOYaiVlqmTVh5vRUKHZL5umQv1G4
    Vp8+LNPjXY3RrrElNTSQ5nbY/uFi/ORc6rm6amsBasdGl2RjH2JzvbMx5TU15ndt
    +flpVccBH1HqEh7DybB1ZwLbrWxjwtWHzvZhypMCgYEAo78sfaaXyKP7c4YLRTdM
    3l2kTgKUEa998njHtojluUGalDD+MunBVUjjkrLDP+kYutLTi8SuiIRfS0SNP0p7
    ZhNJU0MM1FWXoS0O2vRSX45SR+IUVY7ANXWQD1o6I/XvZ3OFL+/rnhS9zutpAMrn
    F3YvrpmpjR2AWq5AKHsuxh8CgYA0UKrV/Vh5RExiNEvYnNX7fsVD331dVb7rLJ7s
    UxH1Q9TaF3vFrWOWMmy/aSRP51UZfZMYGXTGzuHVFPbjf7k69hBXXhNiGZZ3HpEA
    XU+NT3LEVIZFjKHvqOri8KEsUoND50ecDSkI3/ZzOMRMr89GbzOiL5K3lHprwiFX
    df8TWQKBgBTNiwT2ljoIDh+TZO4ElQLGrzQcHafJSKJ6qRGS45fFqutF/u6WEhGN
    5ICesvHu1zHS6lZqj5PUUWC45g9z8zXQtD9seY9msL6iLnAcupv19bqhUJeklkxH
    I42PdCs6/4xsh50ys4lwhgeE6Ts7aVB6ltcj6LJL4f07pqklspyk
    -----END RSA PRIVATE KEY-----
    """).encode("ascii"),
    password=None,
)


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
    # TODO: Asking for invalid/dummy signatures, or signatures made with a different key than the one in KeyInfo.
    signAssertion: bool = False


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
            cert_pem=SAML_CERT_PEM,
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
        sign_assertion=config.signAssertion,
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

    is_sign_assertion = utils.unpack(payload.sessionIndex).get("sign_assertion", False)

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

    root = ElementTree.fromstring(response_xml)

    if is_sign_assertion:
        # <https://stackoverflow.com/a/7073749/151048>
        assertion_el = root.find("./{urn:oasis:names:tc:SAML:2.0:assertion}Assertion")
        cano_assertion = ElementTree.canonicalize(
            ElementTree.tostring(assertion_el),
            strip_text=True,
        )
        sha1_hash: bytes = base64.b64encode(hashlib.sha1(cano_assertion.encode("utf-8")).digest())
        sign: str = base64.b64encode(SAML_PRIVATE_KEY.sign(
            sha1_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256(),
        )).decode("ascii")

        signature_el = ElementTree.Element("ds:Signature", {"xmlns:ds": "http://www.w3.org/2000/09/xmldsig#"})
        signed_info_el = ElementTree.SubElement(signature_el, "ds:SignedInfo")
        ElementTree.SubElement(
            signed_info_el,
            "ds:CanonicalizationMethod",
            {
                "Algorithm": "http://www.w3.org/2001/10/xml-exc-c14n#",
            },
        )
        ElementTree.SubElement(
            signed_info_el,
            "ds:SignatureMethod",
            {
                "Algorithm": "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
            },
        )
        reference_el = ElementTree.SubElement(
            signed_info_el,
            "ds:Reference",
            {
                "URI": f"#{assertion_id}",
            },
        )
        transforms_el = ElementTree.SubElement(reference_el, "ds:Transforms")
        ElementTree.SubElement(
            transforms_el,
            "ds:Transform",
            {
                "Algorithm": "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
            },
        )
        ElementTree.SubElement(
            transforms_el,
            "ds:Transform",
            {
                "Algorithm": "http://www.w3.org/2001/10/xml-exc-c14n#",
            },
        )
        ElementTree.SubElement(
            reference_el,
            "ds:DigestMethod",
            {
                "Algorithm": "http://www.w3.org/2000/09/xmldsig#sha1",
            },
        )
        digest_value_el = ElementTree.SubElement(reference_el, "ds:DigestValue")
        digest_value_el.text = sha1_hash.decode("ascii")
        signature_value_el = ElementTree.SubElement(signature_el, "ds:SignatureValue")
        signature_value_el.text = sign
        key_info_el = ElementTree.SubElement(signature_el, "ds:KeyInfo")
        x509_data_el = ElementTree.SubElement(key_info_el, "ds:X509Data")
        x509_certificate_el = ElementTree.SubElement(x509_data_el, "ds:X509Certificate")
        x509_certificate_el.text = SAML_CERT_PEM

        assertion_el.insert(1, signature_el)

    saml_response: bytes = ElementTree.tostring(root)

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
