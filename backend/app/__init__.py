import importlib
import logging
import os
from pathlib import Path

from aiohttp import web, web_middlewares

from . import spa_middleware
from .error_handler import error_handler

logging.basicConfig(level=logging.DEBUG)

sub_app = web.Application()
for module in Path(__file__).parent.glob("handlers/*.py"):
    module = importlib.import_module(f".handlers.{module.stem}", package=__package__)
    if hasattr(module, "init"):
        module.init(sub_app)
    sub_app.add_routes(module.routes)

app = web.Application()
app.add_subapp("/x", sub_app)

app.middlewares.extend(
    [
        error_handler,
        web_middlewares.normalize_path_middleware(
            append_slash=False, remove_slash=True, merge_slashes=True
        ),
    ],
)

STATIC_ROOT = Path(os.environ["STATIC_ROOT"]) if "STATIC_ROOT" in os.environ else None

if STATIC_ROOT:
    app.add_routes([web.static("/", STATIC_ROOT)])
    app.middlewares.append(
        spa_middleware.with_html((STATIC_ROOT / "index.html").read_bytes()),
    )
