from dataclasses import dataclass
from email.message import EmailMessage

import aiosmtplib
from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

routes = RouteTableDef()


@dataclass
class Job:
    host: str
    port: int
    username: str
    password: str
    sender: str
    to: list[str]
    subject: str
    body_plain: str
    ssl: str


@routes.post("/send-mail")
async def send_mail_view(request: web.Request) -> web.Response:
    job = Job(**(await request.json()))

    if job.ssl == "disable":
        # No SSL
        use_tls = start_tls = False

    elif job.ssl == "connect-with-tls":
        # Connect with TLS
        use_tls = True
        start_tls = False

    elif job.ssl == "starttls-when-available":
        # Start TLS, if supported, otherwise connect plain
        use_tls = False
        start_tls = None

    elif job.ssl == "starttls-required":
        # Start TLS, fail if not supported
        use_tls = False
        start_tls = True

    else:
        return web.json_response({"ok": False, "error": "invalid ssl mode"}, status=400)

    message = EmailMessage()
    message["From"] = job.sender
    message["To"] = ", ".join(job.to)
    message["Subject"] = job.subject
    message.set_content(job.body_plain)

    try:
        await aiosmtplib.send(
            message,
            hostname=job.host,
            port=job.port,
            username=job.username or None,
            password=job.password or None,
            use_tls=use_tls,
            start_tls=start_tls,
        )
    except aiosmtplib.SMTPConnectError as error:
        return web.json_response({"ok": False, "error": str(error)})

    return web.json_response({"ok": True})
