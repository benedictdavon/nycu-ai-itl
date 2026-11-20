"""Tests for the LLM client. No network: the server is replaced by httpx.MockTransport."""

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


def _client(
    handler: Callable[[httpx.Request], httpx.Response], api_key: str = ""
) -> llm.OpenAIChatClient:
    return llm.OpenAIChatClient(
        "http://server/v1", "test-model", 5, api_key=api_key, transport=httpx.MockTransport(handler)
    )


def test_sends_schema_no_thinking_and_reads_reply() -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"a": 1}'}}]})

    assert _client(handler, api_key="secret").chat("sys", "user", schema=Pair) == '{"a": 1}'
    assert sent[0].url.path == "/v1/chat/completions"
    assert sent[0].headers["authorization"] == "Bearer secret"
    body = json.loads(sent[0].content)
    assert body["temperature"] == 0
    assert body["chat_template_kwargs"] == {"enable_thinking": False}
    assert body["response_format"]["json_schema"]["schema"] == Pair.model_json_schema()


def test_no_auth_header_without_key() -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "hi"}}]})

    _client(handler).chat("sys", "user")
    assert "authorization" not in sent[0].headers
    assert "response_format" not in json.loads(sent[0].content)


def test_errors_become_llm_error() -> None:
    with pytest.raises(llm.LLMError):
        _client(lambda request: httpx.Response(500, json={"error": "boom"})).chat("sys", "user")
    with pytest.raises(llm.LLMError):
        _client(lambda request: httpx.Response(200, json={"choices": []})).chat("sys", "user")


def test_empty_base_url_is_refused() -> None:
    with pytest.raises(llm.LLMError):
        llm.OpenAIChatClient(" ", "", 5)


def test_chat_json_validates(fake: llm.FakeClient) -> None:
    fake.queue('{"a": 2}', "not json")
    assert llm.chat_json("sys", "user", Pair) == Pair(a=2)
    with pytest.raises(llm.LLMError):
        llm.chat_json("sys", "user", Pair)
    assert [call[2] for call in fake.calls] == [Pair, Pair]


def test_fake_reply_is_used_only_when_nothing_is_queued(fake: llm.FakeClient) -> None:
    assert llm.chat_json("sys", "user", Pair, fake_reply=Pair(a=7)) == Pair(a=7)
    fake.queue('{"a": 3}')
    assert llm.chat_json("sys", "user", Pair, fake_reply=Pair(a=7)) == Pair(a=3)
