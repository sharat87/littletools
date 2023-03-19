import os

import aiohttp
import pytest

SERVER_PORT = os.environ.get("PORT", 3061)


@pytest.fixture
async def client_session() -> aiohttp.ClientSession:
    async with aiohttp.ClientSession(f"http://localhost:{SERVER_PORT}") as session:
        yield session
