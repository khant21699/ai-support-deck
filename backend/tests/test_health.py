import logging

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@app.get("/boom")  # a route that always crashes, to test error logging
def boom():
    raise RuntimeError("something broke")


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_protected_routes_require_login():
    assert client.get("/tickets").status_code == 401
    assert client.get("/dashboard/summary").status_code == 401


def test_each_request_is_logged_with_status_and_time(caplog):
    with caplog.at_level(logging.INFO, logger="app.api"):
        client.get("/tickets")
    assert "GET /tickets -> 401" in caplog.text
    assert " ms)" in caplog.text


def test_unhandled_errors_are_logged_and_return_500(caplog):
    with caplog.at_level(logging.INFO, logger="app.api"):
        response = client.get("/boom")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "GET /boom -> unhandled error" in caplog.text
    assert "something broke" in caplog.text  # the traceback is included
