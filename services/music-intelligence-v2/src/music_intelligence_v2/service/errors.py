from __future__ import annotations

from typing import Any


class ServiceError(Exception):
    """Base for every failure the service can express to a caller.

    ``message`` is the stable public text.  ``detail`` stays internal: it is
    logged but never returned, so local paths and model errors cannot leak.
    """

    code = "internal_error"
    http_status = 500
    message = "Unexpected service error."

    def __init__(self, detail: str | None = None, **context: Any) -> None:
        super().__init__(detail or self.message)
        self.detail = detail
        self.context = context

    def to_public_dict(self) -> dict[str, Any]:
        return {"error": {"code": self.code, "message": self.message}}


class MalformedRequest(ServiceError):
    code = "malformed_request"
    http_status = 400
    message = "Request body must be a JSON object."


class EmptyQuery(ServiceError):
    code = "empty_query"
    http_status = 400
    message = "Field 'query' is required and must not be empty."


class QueryTooLong(ServiceError):
    code = "query_too_long"
    http_status = 400
    message = "Field 'query' is longer than the supported maximum."


class LimitOutOfBounds(ServiceError):
    code = "limit_out_of_bounds"
    http_status = 400
    message = "Field 'limit' must be an integer within the supported range."


class UnsupportedLanguage(ServiceError):
    code = "unsupported_language"
    http_status = 400
    message = "Field 'language' must be one of: auto, en, es."


class IndexNotLoaded(ServiceError):
    code = "index_not_loaded"
    http_status = 503
    message = "Search index is not loaded."


class IncompatibleIndex(ServiceError):
    code = "incompatible_index"
    http_status = 503
    message = "Search index is incompatible with this service build."


class ModelUnavailable(ServiceError):
    code = "model_unavailable"
    http_status = 503
    message = "Retrieval model is unavailable."


class TranslationFailed(ServiceError):
    code = "translation_failed"
    http_status = 503
    message = "Spanish translation is unavailable."


class RouteNotFound(ServiceError):
    code = "not_found"
    http_status = 404
    message = "Unknown endpoint."


class MethodNotAllowed(ServiceError):
    code = "method_not_allowed"
    http_status = 405
    message = "Method not allowed for this endpoint."


class PayloadTooLarge(ServiceError):
    code = "payload_too_large"
    http_status = 413
    message = "Request body is larger than the supported maximum."
