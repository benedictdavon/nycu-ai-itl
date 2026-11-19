"""LLM client: Ollama for real runs, a fake client for tests and the no-Ollama setup.

Owner: scaffold. Used by the encoder (Part B) and the decoder (Part C).
"""

from collections import deque
from typing import Any, Protocol

import httpx
from pydantic import BaseModel, ValidationError

from app.config import get_settings


class LLMError(RuntimeError):
    """The LLM could not be reached or returned something unusable. The API returns 503."""


class LLMClient(Protocol):
    def chat(self, system: str, user: str, *, schema: type[BaseModel] | None = None) -> str: ...


class OllamaClient:
    """Calls Ollama's /api/chat with temperature 0."""

    def __init__(
        self, host: str, model: str, timeout: float, *, transport: httpx.BaseTransport | None = None
    ) -> None:
        if not model.strip():
            raise LLMError("LLM_MODEL is empty. Set it in .env, or use LLM_BACKEND=fake.")
        self.model = model
        self._http = httpx.Client(base_url=host.rstrip("/"), timeout=timeout, transport=transport)

    def chat(self, system: str, user: str, *, schema: type[BaseModel] | None = None) -> str:
        body: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"temperature": 0},
        }
        if schema is not None:
            body["format"] = schema.model_json_schema()  # Ollama structured output
        try:
            response = self._http.post("/api/chat", json=body)
            response.raise_for_status()
            return str(response.json()["message"]["content"])
        except httpx.HTTPError as exc:
            raise LLMError(f"Ollama request failed: {exc}. Is `ollama serve` running?") from exc
        except (ValueError, KeyError, TypeError) as exc:
            raise LLMError("Ollama sent a reply this client does not understand.") from exc


class FakeClient:
    """Canned replies, first in first out, for tests and LLM_BACKEND=fake."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, type[BaseModel] | None]] = []
        self._replies: deque[str] = deque()

    def queue(self, *replies: str) -> None:
        self._replies.extend(replies)

    def chat(self, system: str, user: str, *, schema: type[BaseModel] | None = None) -> str:
        self.calls.append((system, user, schema))
        if self._replies:
            return self._replies.popleft()
        return "{}" if schema is not None else "[fake LLM reply]"


_client: LLMClient | None = None


def get_llm() -> LLMClient:
    """The process-wide client, chosen by settings.llm_backend."""
    global _client
    if _client is None:
        settings = get_settings()
        if settings.llm_backend == "ollama":
            _client = OllamaClient(settings.ollama_host, settings.llm_model, settings.llm_timeout_s)
        else:
            _client = FakeClient()
    return _client


def reset_llm() -> None:
    """Forget the cached client (tests)."""
    global _client
    _client = None


def chat_json[T: BaseModel](system: str, user: str, schema: type[T]) -> T:
    """Ask for JSON in the shape of `schema` and validate it. Raises LLMError if invalid."""
    raw = get_llm().chat(system, user, schema=schema)
    try:
        return schema.model_validate_json(raw)
    except ValidationError as exc:
        raise LLMError(f"The model did not return valid {schema.__name__} JSON: {raw}") from exc
