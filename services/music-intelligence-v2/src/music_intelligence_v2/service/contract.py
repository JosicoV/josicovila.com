from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .errors import (
    EmptyQuery,
    LimitOutOfBounds,
    MalformedRequest,
    QueryTooLong,
    UnsupportedLanguage,
)

CONTRACT_VERSION = "1.0"
DEFAULT_LIMIT = 8
MAX_LIMIT = 10
MAX_QUERY_CHARACTERS = 300
SUPPORTED_LANGUAGES = ("auto", "en", "es")
RESOLVED_LANGUAGES = ("en", "es")


@dataclass(frozen=True)
class SearchRequest:
    query: str
    language: str
    limit: int


def _parse_limit(payload: dict[str, Any]) -> int:
    if "limit" not in payload or payload["limit"] is None:
        return DEFAULT_LIMIT
    value = payload["limit"]
    # ``bool`` is an ``int`` subclass; ``{"limit": true}`` is a malformed limit.
    if isinstance(value, bool) or not isinstance(value, int):
        raise LimitOutOfBounds(f"Field 'limit' has type {type(value).__name__}")
    if not 1 <= value <= MAX_LIMIT:
        raise LimitOutOfBounds(f"Field 'limit' is {value}, outside 1..{MAX_LIMIT}")
    return value


def _parse_language(payload: dict[str, Any]) -> str:
    if "language" not in payload or payload["language"] is None:
        return "auto"
    value = payload["language"]
    if not isinstance(value, str):
        raise UnsupportedLanguage(f"Field 'language' has type {type(value).__name__}")
    normalized = value.strip().casefold()
    if normalized not in SUPPORTED_LANGUAGES:
        raise UnsupportedLanguage(f"Field 'language' is '{value}'")
    return normalized


def parse_search_request(payload: Any) -> SearchRequest:
    if not isinstance(payload, dict):
        raise MalformedRequest(f"Request body is {type(payload).__name__}, expected object")
    if "query" not in payload:
        raise EmptyQuery("Field 'query' is absent")
    raw_query = payload["query"]
    if not isinstance(raw_query, str):
        raise EmptyQuery(f"Field 'query' has type {type(raw_query).__name__}")
    query = raw_query.strip()
    if not query:
        raise EmptyQuery("Field 'query' is blank")
    if len(query) > MAX_QUERY_CHARACTERS:
        raise QueryTooLong(f"Field 'query' has {len(query)} characters")
    return SearchRequest(query=query, language=_parse_language(payload), limit=_parse_limit(payload))


def parse_suggest_request(payload: Any) -> SearchRequest:
    """``/suggest`` shares the search contract so the frontend can reuse it."""
    if isinstance(payload, dict) and not str(payload.get("query", "")).strip():
        # A suggestion box legitimately fires on an empty input.
        return SearchRequest(query="", language=_parse_language(payload), limit=_parse_limit(payload))
    return parse_search_request(payload)
