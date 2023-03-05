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


def b64_json_bytes(data: dict) -> bytes:
    return base64.urlsafe_b64encode(
        json.dumps(data, separators=JSON_COMPACT_SEPARATORS).encode()
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
