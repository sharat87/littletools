import aiohttp
import pytest


@pytest.fixture
async def client_session() -> aiohttp.ClientSession:
    async with aiohttp.ClientSession("http://localhost:3061") as session:
        yield session
