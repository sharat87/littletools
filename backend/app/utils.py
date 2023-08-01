import base64
import dataclasses
import functools
import json
from typing import Any

from aiohttp import web

JSON_COMPACT_SEPARATORS = ",", ":"


def b64_json(data: dict) -> str:
    return base64.urlsafe_b64encode(
        json.dumps(data, separators=JSON_COMPACT_SEPARATORS).encode()
    ).decode()


def pack(data=None, **kwargs) -> bytes:
    if data:
        data.update(kwargs)
    else:
        data = kwargs
    return base64.urlsafe_b64encode(
        json.dumps(data, separators=JSON_COMPACT_SEPARATORS).encode()
    )


def pack_str(data: dict) -> str:
    return pack(data).decode("ascii")


def unpack(data: str | bytes) -> dict:
    return json.loads(base64.urlsafe_b64decode(data).decode("utf-8"))


def safe_email_domain(email: str) -> str:
    return (
        email
        if email.endswith("@example.com")
        else email.replace("@", "-at-") + "@example.com"
    )


def custom_to_json(o: Any) -> Any:
    if dataclasses.is_dataclass(o):
        return dataclasses.asdict(o)

    if isinstance(o, bytes):
        return o.decode("utf-8")

    raise TypeError("Unknown type, can't convert to a JSON-serializable type")


json_response = functools.partial(
    web.json_response,
    dumps=functools.partial(
        json.dumps, separators=JSON_COMPACT_SEPARATORS, default=custom_to_json
    ),
)
