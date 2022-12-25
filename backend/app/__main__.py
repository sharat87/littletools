import os

from aiohttp import web

from . import app

web.run_app(app, port=int(os.getenv("PORT", 3061)))
