from yarl import URL


async def test_start_authorize(client_session) -> None:
    async with client_session.post(
        "/x/oauth2-client-start",
        data={
            "authorize_url": "http://myauth.com:1234/authorize",
            "client_id": "cid",
            "client_secret": "cs",
            "redirect_uri": "http://localhost:5678/redirect-uri",
            "scope": "one two three",
            "token_url": "http://myauth.com:1234/token",
        },
        allow_redirects=False,
    ) as response:
        assert response.status == 302
        location = URL(response.headers["location"])
        assert str(location.with_query(None)) == "http://myauth.com:1234/authorize"
        query_data = dict(location.query)
        assert query_data.pop("state")
        assert query_data == {
            "response_type": "code",
            "client_id": "cid",
            "redirect_uri": "http://localhost:5678/redirect-uri",
            "scope": "one two three",
        }
