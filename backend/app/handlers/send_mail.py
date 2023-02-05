from dataclasses import dataclass
from email.message import EmailMessage

from aiohttp import web
from aiohttp.web_routedef import RouteTableDef
from aiosmtplib import SMTP, SMTPConnectError, SMTPResponse

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

    client = TrailSMTP(
        hostname=job.host,
        port=job.port,
        username=job.username or None,
        password=job.password or None,
        use_tls=use_tls,
        start_tls=start_tls,
    )

    try:
        async with client:
            await client.send_message(message)

    except SMTPConnectError as error:
        return web.json_response({"ok": False, "error": str(error)})

    return web.json_response({"ok": True, "log": client.log})


class TrailSMTP(SMTP):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.log = []

    async def execute_command(self, *args: bytes, timeout: float = None) -> SMTPResponse:
        self.log.append(b" ".join(args).decode("utf-8"))
        response = await super().execute_command(*args, timeout=timeout)
        self.log.append(response.message)
        return response
