"""LLM client: llama-server (OpenAI-compatible API) for real runs, a fake client for tests.

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


class OpenAIChatClient:
    """Calls an OpenAI-compatible `/v1/chat/completions` (llama-server) with temperature 0.

    Qwen3 thinking is switched off (`enable_thinking: false`): it costs latency and a
    `<think>` block would break the JSON. Needs the server to run with `--jinja`.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float,
        *,
        api_key: str = "",
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not base_url.strip():
            raise LLMError("LLM_BASE_URL is empty. Set it in .env, or use LLM_BACKEND=fake.")
        self.model = model.strip()
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"), timeout=timeout, headers=headers, transport=transport
        )

    def chat(self, system: str, user: str, *, schema: type[BaseModel] | None = None) -> str:
        body: dict[str, Any] = {
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        if self.model:  # llama-server serves one model and ignores this
            body["model"] = self.model
        if schema is not None:
            body["response_format"] = {
                "type": "json_schema",
                "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()},
            }
        try:
            response = self._http.post("/chat/completions", json=body)
            response.raise_for_status()
            return str(response.json()["choices"][0]["message"]["content"])
        except httpx.HTTPError as exc:
            raise LLMError(f"Model server request failed: {exc}. Is llama-server running?") from exc
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LLMError(
                "The model server sent a reply this client does not understand."
            ) from exc


class FakeClient:
    """Canned replies, first in first out, for tests and LLM_BACKEND=fake."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, type[BaseModel] | None]] = []
        self._replies: deque[str] = deque()

    def queue(self, *replies: str) -> None:
        self._replies.extend(replies)

    def chat(
        self,
        system: str,
        user: str,
        *,
        schema: type[BaseModel] | None = None,
        default: str | None = None,
    ) -> str:
        """The next queued reply; else `default`; else a placeholder."""
        self.calls.append((system, user, schema))
        if self._replies:
            return self._replies.popleft()
        if default is not None:
            return default
        return "{}" if schema is not None else "[fake LLM reply]"


_client: LLMClient | None = None


def get_llm() -> LLMClient:
    """The process-wide client, chosen by settings.llm_backend."""
    global _client
    if _client is None:
        settings = get_settings()
        if settings.llm_backend == "llama_server":
            _client = OpenAIChatClient(
                settings.llm_base_url,
                settings.llm_model,
                settings.llm_timeout_s,
                api_key=settings.llm_api_key,
            )
        else:
            _client = FakeClient()
    return _client


def reset_llm() -> None:
    """Forget the cached client (tests)."""
    global _client
    _client = None


def chat_json[T: BaseModel](
    system: str, user: str, schema: type[T], *, fake_reply: T | None = None
) -> T:
    """Ask for JSON in the shape of `schema` and validate it. Raises LLMError if invalid.

    `fake_reply` is what LLM_BACKEND=fake returns when no test queued a reply, so the API
    still works end to end without a model (architecture.md §3).
    """
    client = get_llm()
    if isinstance(client, FakeClient):
        default = fake_reply.model_dump_json() if fake_reply is not None else None
        raw = client.chat(system, user, schema=schema, default=default)
    else:
        raw = client.chat(system, user, schema=schema)
    try:
        return schema.model_validate_json(raw)
    except ValidationError as exc:
        raise LLMError(f"The model did not return valid {schema.__name__} JSON: {raw}") from exc
