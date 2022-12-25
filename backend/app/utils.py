import base64
import json

JSON_COMPACT_SEPARATORS = ",", ":"


def b64_json(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data, separators=JSON_COMPACT_SEPARATORS).encode()).decode()


def b64_json_bytes(data: dict) -> bytes:
    return base64.urlsafe_b64encode(json.dumps(data, separators=JSON_COMPACT_SEPARATORS).encode())
