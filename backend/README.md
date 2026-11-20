# LabKnow backend (CP2 prototype)

Contributors upload lab records, a local LLM drafts structured knowledge (`M`) for them to confirm, and requesters ask questions that are answered with links to the source records and their contributors. The product flow is [03 Interaction Design](../docs/cp1/03_interaction_design.md); how we build it is [architecture.md](../docs/cp2/architecture.md); the HTTP API is [api.md](../docs/cp2/api.md).

To run the whole app (backend and frontend together), follow the [root README](../README.md). This file covers the backend on its own, the model server and the backend's layout.

## Run it

You need [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you). The same commands work in PowerShell, Git Bash, macOS and Linux:

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

To load the six made-up records in `samples/records/` as confirmed, searchable records (safe to run twice):

```sh
uv run python -m app.retrieval.seed
```

Open <http://127.0.0.1:8000/docs> to try the routes: `POST /api/infos`, then `POST /api/records/{id}/confirm`, then `POST /api/ask` with a word from the title. If `frontend/dist` exists (built with `npm run build`), the app itself is at <http://127.0.0.1:8000>.

Settings come from environment variables or a `.env` file in the **repo root** (copy [`.env.example`](../.env.example)). The database goes to `data/` (git-ignored). With the default `LLM_BACKEND=fake`, nothing needs a model server. For a real model, see [Model server](#model-server).

## Model server

The app calls [`llama-server`](https://github.com/ggml-org/llama.cpp) (llama.cpp) through its OpenAI-compatible API. Records never go to an outside AI service.

Host side (Darius's shared GPU; keep it small, and pin one GPU). Build only the server, with CUDA (`89` is the RTX 40 series), and download the model:

```sh
git clone https://github.com/ggml-org/llama.cpp ~/llama.cpp && cd ~/llama.cpp
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=89 -DLLAMA_CURL=OFF
cmake --build build --target llama-server -j
mkdir -p ~/models
curl -L -o ~/models/Qwen3-4B-Q8_0.gguf \
  https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q8_0.gguf
```

Make the key file once with `mkdir -p ~/.config/labknow && (umask 077; openssl rand -hex 16 > ~/.config/labknow/llm_api_key)`, then run:

```sh
CUDA_VISIBLE_DEVICES=1 ~/llama.cpp/build/bin/llama-server \
  -m ~/models/Qwen3-4B-Q8_0.gguf \
  --jinja -ngl 99 -c 8192 -np 2 --sleep-idle-seconds 600 \
  --host <tailscale-ip> --port 8080 --api-key-file ~/.config/labknow/llm_api_key
```

- `--api-key-file`, not `--api-key`: on a shared machine, every user can read command-line arguments with `ps`.
- `--jinja` is needed so the app can switch Qwen3 thinking off.
- `-c 8192 -np 2`: two requests at a time, and the context is split between them, so each request (prompt and reply together) gets **4096 tokens**. The decoder needs about 2000. A long upload sent to the encoder may need `-np 1` or a larger `-c`.
- `--sleep-idle-seconds 600`: after 10 minutes with no request, the model is unloaded and the GPU memory freed (about 5.9 GB down to 0.6 GB). The next request reloads it and waits, which added under 1 s in our test. `/health` stays 200 while asleep and does not wake it. Before a demo, send one request a minute ahead.
- `--host`: the Tailscale IP, or `127.0.0.1` when running locally, never `0.0.0.0`.

To keep it running, use a systemd **user** service (no admin rights needed). Put this in `~/.config/systemd/user/llama-server.service`:

```ini
[Unit]
Description=llama-server (Qwen3-4B) for LabKnow
After=network-online.target

[Service]
Environment=CUDA_VISIBLE_DEVICES=1
ExecStart=%h/llama.cpp/build/bin/llama-server -m %h/models/Qwen3-4B-Q8_0.gguf --jinja -ngl 99 -c 8192 -np 2 --sleep-idle-seconds 600 --host <tailscale-ip> --port 8080 --api-key-file %h/.config/labknow/llm_api_key
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

Then `systemctl --user daemon-reload && systemctl --user enable --now llama-server`, and `loginctl enable-linger $USER` so it starts at boot without a login. It restarts about 10 s after a crash, and at boot it retries until Tailscale has its IP. The log is `journalctl --user -u llama-server`.

Measured on the RTX 4090 with Qwen3-4B Q8_0: a short decoder answer takes about 0.4–0.7 s, and a `RecordDraft` JSON reply about 4 s.

App side, in `.env`:

```sh
LLM_BACKEND=llama_server
LLM_BASE_URL=http://<tailscale-ip>:8080/v1
LLM_API_KEY=<same key>
```

The fallback is the same command with a smaller model on the demo laptop and `LLM_BASE_URL=http://localhost:8080/v1`.

## Tests

```sh
uv run ruff check . && uv run ruff format --check .
uv run pytest -q
```

`tests/test_api_flow.py` walks the skeleton through the API. Keep it passing, and extend it with your part's steps of the 03 flow.

## Where things live

| Path | What | Owner |
|---|---|---|
| `app/models.py` | Shared data structures: the contract. Changes need every owner's review. | Scaffold |
| `app/main.py`, `app/config.py`, `app/llm.py`, `app/api/` | App, settings, LLM client, HTTP routes | Scaffold, then each part adds its routes |
| `app/db.py`, `app/retrieval/` | SQLite storage, FTS5 search, contributor suggestion, sample seeder | Part A |
| `app/encoder/` | Encoder: drafts `M` with the model, at most two follow-up questions; prompts in `prompts/` | Part B |
| `app/decoder/` | Decoder: answers from search hits with the citation check; prompts in `prompts/` | Part C |
| `prompt_suite/` | Prompt test suite runner and cases, run against the real model | Parts B and C |
| `../frontend/` | React app, served from `frontend/dist` once built | Part D |
| `../samples/` | Made-up members, records with answer keys, a discussion (English) | everyone |
