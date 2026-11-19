"""Tests for the LLM client. No network: Ollama is replaced by httpx.MockTransport."""

import json
from collections.abc import Callable, Iterator

import httpx
import pytest
from pydantic import BaseModel

from app import llm


class Pair(BaseModel):
    a: int


@pytest.fixture
def fake() -> Iterator[llm.FakeClient]:
    client = llm.FakeClient()
    llm._client = client
    yield client
    llm.reset_llm()


def _ollama(handler: Callable[[httpx.Request], httpx.Response]) -> llm.OllamaClient:
    return llm.OllamaClient(
        "http://ollama", "test-model", 5, transport=httpx.MockTransport(handler)
    )


def test_ollama_sends_schema_and_reads_reply() -> None:
    sent: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(json.loads(request.content))
        return httpx.Response(200, json={"message": {"content": '{"a": 1}'}})

    assert _ollama(handler).chat("sys", "user", schema=Pair) == '{"a": 1}'
    assert sent[0]["model"] == "test-model"
    assert sent[0]["format"] == Pair.model_json_schema()
    assert sent[0]["options"]["temperature"] == 0


def test_ollama_errors_become_llm_error() -> None:
    client = _ollama(lambda request: httpx.Response(500, json={"error": "boom"}))
    with pytest.raises(llm.LLMError):
        client.chat("sys", "user")


def test_empty_model_is_refused() -> None:
    with pytest.raises(llm.LLMError):
        llm.OllamaClient("http://ollama", " ", 5)


def test_chat_json_validates(fake: llm.FakeClient) -> None:
    fake.queue('{"a": 2}', "not json")
    assert llm.chat_json("sys", "user", Pair) == Pair(a=2)
    with pytest.raises(llm.LLMError):
        llm.chat_json("sys", "user", Pair)
    assert [call[2] for call in fake.calls] == [Pair, Pair]
