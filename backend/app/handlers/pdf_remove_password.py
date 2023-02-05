import subprocess

from aiohttp import web
from aiohttp.web_routedef import RouteTableDef

routes = RouteTableDef()


@routes.post("/pdf-remove-password")
async def pdf_remove_password_view(request: web.Request) -> web.Response:
    password = pdf_file_part = pdf_file_body = None
    reader = await request.multipart()

    for _ in range(2):
        part = await reader.fetch_next_part()
        if part.name == "password":
            password = await part.text()
        elif part.name == "pdfFile":
            pdf_file_part = part
            pdf_file_body = await part.read()
        else:
            raise web.HTTPBadRequest(text="Unexpected form field: " + part.name)

    if not password:
        return web.json_response(
            {
                "ok": False,
                "error": "password is required",
            },
            status=400,
        )

    if (
        not pdf_file_body
        or not pdf_file_part.name.endswith(".pdf")
        or pdf_file_part.headers.get("Content-Type") != "application/pdf"
    ):
        return web.json_response(
            {
                "ok": False,
                "error": "pdfFile must be a valid pdf file",
            },
            status=400,
        )

    process = subprocess.Popen(
        [
            "gs",
            "-q",
            "-dNOPAUSE",
            "-dBATCH",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-sPDFPassword=" + password,
            "-sOutputFile=-",  # write to stdout
            "-f",
            "-",  # read from stdin
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    stdout, stderr = process.communicate(input=pdf_file_body, timeout=10)
    if process.returncode != 0:
        return web.json_response(
            {
                "ok": False,
                "error": stderr.decode("utf-8"),
            },
            status=400,
        )

    return web.Response(body=stdout, content_type="application/pdf")
