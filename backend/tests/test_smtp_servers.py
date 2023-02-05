from email.message import EmailMessage

import aiohttp
import aiosmtplib
import pytest


def make_message(to="to@l.co", subject="Test mail plain body") -> EmailMessage:
    message = EmailMessage()
    message["From"] = "from@l.co"
    message["To"] = to
    message["Subject"] = "Tester mail"
    message.set_content(subject)
    return message


async def test_websocket_cleanup(client_session: aiohttp.ClientSession) -> None:
    for _ in range(2):
        async with client_session.ws_connect("/x/smtp-ws") as ws:
            assert await ws.receive_str() == "hello"
            await ws.send_json({"watch": "accept@l.co"})
            assert await ws.receive_str() == "ok"

            await aiosmtplib.send(
                make_message(to="accept@l.co", subject="accepted"),
                hostname="localhost",
                port=7025,
            )

            msg = await ws.receive_json()
            assert "accepted" in msg["msg"]


async def test_auth_none_tls_none(client_session: aiohttp.ClientSession) -> None:
    async with client_session.ws_connect("/x/smtp-ws") as ws:
        assert await ws.receive_str() == "hello"
        await ws.send_json({"watch": "accept@l.co"})
        assert await ws.receive_str() == "ok"

        await aiosmtplib.send(
            make_message(to="ignore@l.co", subject="ignored"),
            hostname="localhost",
            port=7025,
        )

        await aiosmtplib.send(
            make_message(to="accept@l.co", subject="accepted"),
            hostname="localhost",
            port=7025,
        )

        with pytest.raises(aiosmtplib.SMTPException):
            await aiosmtplib.send(
                make_message(to="accept@l.co", subject="accepted"),
                hostname="localhost",
                port=7025,
                username="one",
                password="two",
            )

        msg = await ws.receive_json()
        assert "accepted" in msg["msg"]


async def test_auth_any_tls_none(client_session: aiohttp.ClientSession) -> None:
    async with client_session.ws_connect("/x/smtp-ws") as ws:
        assert await ws.receive_str() == "hello"
        await ws.send_json({"watch": "accept@l.co"})
        assert await ws.receive_str() == "ok"

        await aiosmtplib.send(
            make_message(to="ignore@l.co", subject="ignored"),
            hostname="localhost",
            port=7026,
            username="little",
            password="non-secret",
            use_tls=False,
            start_tls=False,
        )

        await aiosmtplib.send(
            make_message(to="accept@l.co", subject="accepted"),
            hostname="localhost",
            port=7026,
            username="little",
            password="non-secret",
            use_tls=False,
            start_tls=False,
        )

        with pytest.raises(aiosmtplib.SMTPException):
            await aiosmtplib.send(
                make_message(to="accept@l.co", subject="should error out"),
                hostname="localhost",
                port=7026,
            )

        msg = await ws.receive_json()
        assert "ignored" not in msg["msg"]
        assert "accepted" in msg["msg"]
