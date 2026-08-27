import io
import json
import threading
import urllib.error
import urllib.request

import pytest
from service_fixtures import FakeEncoder, FakeTranslator, build_index

from music_intelligence_v2.service.http import create_server
from music_intelligence_v2.service.observability import StructuredLogger
from music_intelligence_v2.service.pipeline import SearchService


class Client:
    def __init__(self, base_url):
        self.base_url = base_url

    def get(self, path):
        return self._send(urllib.request.Request(self.base_url + path, method="GET"))

    def post(self, path, payload, *, raw=None, method="POST"):
        body = raw if raw is not None else json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        return self._send(request)

    @staticmethod
    def _send(request):
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))


def serve(service):
    logger = StructuredLogger(stream=io.StringIO())
    server = create_server(service, logger, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    return server, thread, Client(f"http://{host}:{port}"), logger


@pytest.fixture
def client():
    service = SearchService(build_index(), FakeEncoder(), FakeTranslator())
    server, thread, http_client, logger = serve(service)
    try:
        yield http_client, logger
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


@pytest.fixture
def degraded_client():
    server, thread, http_client, logger = serve(SearchService(None, None, None))
    try:
        yield http_client, logger
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_health_is_ok_when_every_component_is_loaded(client):
    http_client, _ = client
    status, payload = http_client.get("/health")

    assert status == 200
    assert payload["status"] == "ok"
    assert payload["index_loaded"] is True
    assert payload["catalogue_tracks"] == 4
    assert payload["model_ready"] is True
    assert payload["translator_ready"] is True


def test_health_is_503_when_the_index_is_missing(degraded_client):
    http_client, _ = degraded_client
    status, payload = http_client.get("/health")

    assert status == 503
    assert payload["status"] == "degraded"
    assert payload["index_loaded"] is False


def test_search_returns_the_public_contract(client):
    http_client, _ = client
    status, payload = http_client.post("/search", {"query": "believe", "limit": 2})

    assert status == 200
    assert payload["query_original"] == "believe"
    assert payload["detected_language"] == "en"
    assert len(payload["results"]) == 2
    assert payload["results"][0]["track_id"] == "believe-studio"


def test_search_on_a_degraded_service_returns_index_not_loaded(degraded_client):
    http_client, _ = degraded_client
    status, payload = http_client.post("/search", {"query": "believe"})

    assert status == 503
    assert payload["error"]["code"] == "index_not_loaded"


@pytest.mark.parametrize(
    ("payload", "expected_status", "expected_code"),
    [
        ({"query": ""}, 400, "empty_query"),
        ({}, 400, "empty_query"),
        ({"query": "believe", "limit": 99}, 400, "limit_out_of_bounds"),
        ({"query": "believe", "language": "de"}, 400, "unsupported_language"),
        ({"query": "x" * 400}, 400, "query_too_long"),
    ],
)
def test_invalid_requests_map_to_stable_error_codes(client, payload, expected_status, expected_code):
    http_client, _ = client
    status, body = http_client.post("/search", payload)

    assert status == expected_status
    assert body["error"]["code"] == expected_code
    assert set(body["error"]) == {"code", "message"}


def test_malformed_json_is_rejected(client):
    http_client, _ = client
    status, body = http_client.post("/search", None, raw=b"{not json")

    assert status == 400
    assert body["error"]["code"] == "malformed_request"


def test_oversized_body_is_rejected(client):
    http_client, _ = client
    status, body = http_client.post("/search", {"query": "believe", "padding": "x" * 20000})

    assert status == 413
    assert body["error"]["code"] == "payload_too_large"


def test_unknown_route_and_wrong_method(client):
    http_client, _ = client

    assert http_client.get("/searchz")[1]["error"]["code"] == "not_found"
    assert http_client.get("/search")[1]["error"]["code"] == "method_not_allowed"
    assert http_client.post("/health", {})[1]["error"]["code"] == "method_not_allowed"
    assert http_client.post("/search", {"query": "believe"}, method="DELETE")[1]["error"]["code"] == "method_not_allowed"


def test_suggest_returns_the_stubbed_contract(client):
    http_client, _ = client
    status, payload = http_client.post("/suggest", {"query": "bel"})

    assert status == 200
    assert payload == {"query_original": "bel", "available": False, "suggestions": []}


def test_logs_are_structured_and_never_contain_raw_queries(client):
    http_client, logger = client
    http_client.post("/search", {"query": "believe"})
    http_client.post("/search", {"query": ""})

    records = [json.loads(line) for line in logger.stream.getvalue().splitlines()]
    search = next(record for record in records if record["event"] == "search")
    failure = next(record for record in records if record["event"] == "request_failed")

    assert "query" not in search
    assert "query_normalized_en" not in search
    assert search["result_count"] == 3
    assert search["index_version"] == "test-index-1"
    assert search["detected_language"] == "en"
    assert set(search) >= {"request_id", "timestamp", "translation_used", "retrieval_ms", "total_ms"}
    assert failure["error_code"] == "empty_query"
