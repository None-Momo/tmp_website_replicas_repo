# LLM-agents-website-replicas

# Website Playground

This project runs a **frontend** (React app) and a **backend** (FastAPI server) that can use an OpenAI-compatible API for LLM recommendations and page generation. You can run everything with **Docker** (one container) or **locally** (two processes).

**The LLM is optional.** The six study websites are static/deterministic and work without an LLM, as does MORPH telemetry. `OPENAI_API_KEY` is only needed if you intentionally enable the LLM features; without it the app runs in LLM-disabled mode and the LLM endpoints return 503. The Render deployment for the BLV study **requires** `OPENAI_API_KEY`, because MORPH calls the LLM through the [MORPH LLM proxy](#morph-llm-proxy) on this backend. Without it, the study websites and telemetry still work, but MORPH's LLM calls fail with HTTP 503.

(More details on supported tasks can be found in the paper)(https://arxiv.org/abs/2601.16356)

## Table of contents

- [Option 1: Run with Docker (Recommended)](#option-1-run-with-docker-recommended)
- [Option 2: Run locally](#option-2-run-locally)
- [Ports and URLs](#ports-and-urls)
- [Available frontend routes](#available-frontend-routes)
- [Configuration reference](#configuration-reference)
- [MORPH LLM proxy](#morph-llm-proxy)
- [MORPH telemetry storage](#morph-telemetry-storage)

---

## Option 1: Run with Docker (Recommended)

Docker builds the frontend, runs the backend and nginx in one container, and generates `config.ini` from environment variables at startup. No API key is stored in the image.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- Optional: an [OpenAI API key](https://platform.openai.com/api-keys) (or compatible API key), only for the LLM features

### Build the image

From this directory:

```bash
docker build -t website-playground .
```

### Run the container

No environment variables are required to start it. Without a key the app runs in LLM-disabled mode, and without the [Firebase settings](#render-configuration) telemetry uploads return 503; the study websites work either way:

```bash
docker run -p 3000:3000 -p 8089:8089 website-playground
```

To enable the LLM features, pass your API key via the `OPENAI_API_KEY` environment variable:

```bash
docker run -p 3000:3000 -p 8089:8089 -e OPENAI_API_KEY=your-api-key-here website-playground
```

**Optional:** If your API uses a different base URL (e.g. a proxy or another provider) or model:

```bash
docker run -p 3000:3000 -p 8089:8089 \
  -e OPENAI_API_KEY=your-api-key-here \
  -e OPENAI_BASE_URL=https://your-api-base.com/v1 \
  -e OPENAI_MODEL=gpt-4o-mini \
  website-playground
```

If you omit `OPENAI_BASE_URL`, it defaults to `https://api.openai.com/v1`; `OPENAI_MODEL` defaults to `gpt-4o-mini`.

### Access the app

- **Frontend (UI):** http://localhost:3000
- **Backend API:** http://localhost:8089/docs

The frontend calls the backend on port 8089 for LLM endpoints; nginx in the container proxies `/api/*` to the backend for all routes.

### Docker notes

- If `OPENAI_API_KEY` is not set, the container still starts; LLM endpoints return 503 while everything else works.
- To run in the background: add `-d` (e.g. `docker run -d -p 3000:3000 -p 8089:8089 -e OPENAI_API_KEY=... website-playground`).
- To use different host ports: e.g. `-p 8080:3000 -p 9090:8089` maps frontend to 8080 and backend to 9090.

---

## Option 2: Run locally

You can run the **backend** and **frontend** as two separate processes. The backend needs a `config.ini` with your API key; the frontend is built and served with Node.

### Prerequisites

- **Backend:** Python 3.12+ and `pip`
- **Frontend:** Node.js 18+ and `npm`
- An OpenAI (or compatible) API key

---

### Step 1: Backend

1. Go to the backend directory:

   ```bash
   cd website_playground_server
   ```

2. Create a virtual environment (recommended):

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure the API key. In `config.ini` replace `your-api-key-here` with your api key

5. Start the server:

   ```bash
   python main.py
   ```

   The backend will listen on **http://127.0.0.1:8089**.

---

### Step 2: Frontend

Open a **second terminal** (keep the backend running in the first).

1. Go to the frontend directory:

   ```bash
   cd websites_playground
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the app:

   ```bash
   npm run build
   ```

4. Serve the built app (requires `serve`; install globally if needed: `npm install -g serve`):

   ```bash
   serve -s build
   ```

   By default, the frontend is served on **http://localhost:3000** (or the port shown in the terminal).

---

### Local access

- **Frontend:** http://localhost:3000 (or the port printed by `serve -s build`)
- **Backend API:** http://localhost:8089 (e.g. http://localhost:8089/docs)

The frontend is configured to call the backend at `http://127.0.0.1:8089` for LLM requests; ensure the backend is running before using those features.

---

## Ports and URLs

| Service  | Default port | Purpose                               |
| -------- | ------------ | ------------------------------------- |
| Frontend | 3000         | React app (UI)                        |
| Backend  | 8089         | FastAPI server (LLM, recommendations) |

- **Docker:** Both ports are exposed; map them with `-p` if you want different host ports.
- **Local:** Backend uses 8089; frontend port is set by `serve -s build` (often 3000).

---

## Available frontend routes

Routes defined in the React Router (`websites_playground/src/App.tsx`):

| Path         | Component           | Description            |
| ------------ | ------------------- | ---------------------- |
| `/riverbuy`  | RiverBuyClone       | amazon replica home    |
| `/flight`    | GoogleFlightsSearch | flight search          |
| `/grumble`   | YelpClone           | yelp replica home      |
| `/zoomcar`   | ZoomCarRental       | a car rental home page |
| `/stayscape` | StayScape           | an airbnb replica home |
| `/dwellio`   | Dwellio             | zillow replica home    |
| `/done`      | DonePage            | completion page        |

---

## Configuration reference

### Docker (environment variables)

| Variable          | Required | Default                     | Description                                                        |
| ----------------- | -------- | --------------------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`  | For MORPH | —                          | Enables LLM features and the MORPH proxy; without it, LLM endpoints return 503. |
| `OPENAI_BASE_URL` | No       | `https://api.openai.com/v1` | API base URL for the backend client.                               |
| `OPENAI_MODEL`    | No       | `gpt-4o-mini`               | Chat model used by the backend.                                    |
| `FIREBASE_STORAGE_BUCKET` | For telemetry | — | Firebase Storage bucket for MORPH sessions; see [MORPH telemetry storage](#morph-telemetry-storage). |
| `GOOGLE_APPLICATION_CREDENTIALS` | For telemetry | — | Path to the Firebase service-account key (on Render, a Secret File under `/etc/secrets/`). |

`DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` are **deprecated** aliases that are still accepted so old deployments keep starting; prefer the `OPENAI_*` names.

### Local (`website_playground_server/config.ini`)

| Key               | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `openai_api`      | Your OpenAI (or compatible) API key.                     |
| `openai_base_url` | Optional; defaults to `https://api.openai.com/v1`.       |
| `model`           | Optional; chat model (defaults to `gpt-4o-mini`).        |

The legacy `deepseek_api` / `deepseek_base_url` keys are **deprecated** but still read as fallbacks when the `openai_*` keys are absent.

---

## MORPH LLM proxy

The MORPH extension calls the LLM through this backend, so participants never enter an API key or choose a model. The proxy is OpenAI-compatible: point an OpenAI client at `https://<deployment>/api/llm/v1` with any placeholder API key.

| Route                                | Purpose                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `POST /api/llm/v1/chat/completions`  | Chat Completions, streaming (`"stream": true`) and non-streaming.       |
| `GET /api/llm/v1/health`             | Reports whether the proxy is configured (HTTP 503 when no key is set).  |

- The OpenAI key is the server-side `OPENAI_API_KEY` (or `openai_api` in `config.ini`). The key the client sends is ignored, and the server key never appears in a response.
- The model is pinned to `gpt-6-luna` with `reasoning_effort: "none"`. Any `model`, `reasoning_effort` or `reasoning` sent by the client is overwritten. `OPENAI_MODEL` does not affect the proxy.
- Responses are relayed unchanged, including the `usage` object. For streams, `stream_options.include_usage` defaults to `true` so usage arrives in the final chunk.
- Upstream failures map to OpenAI-style errors: no server key → 503 `missing_api_key`; rejected key → 502 `upstream_auth_error`; model unavailable → 503 `model_unavailable`; OpenAI rate limit → 429; OpenAI 5xx or network failure → 502 (504 on connect timeout).

Optional environment variables:

| Variable                        | Default    | Description                                             |
| ------------------------------- | ---------- | ------------------------------------------------------- |
| `MORPH_LLM_MAX_OUTPUT_TOKENS`   | `4096`     | Cap on `max_completion_tokens` per request.             |
| `MORPH_LLM_RATE_LIMIT_PER_MIN`  | `120`      | Requests per minute per client IP (429 when exceeded).  |
| `MORPH_LLM_MAX_REQUEST_BYTES`   | `10485760` | Largest accepted request body.                          |

---

## MORPH telemetry storage

MORPH uploads study sessions to this backend (today the extension's Download action triggers the upload), and the backend stores them in Firebase:

```
MORPH extension
  → POST /api/telemetry/sessions   (this backend on Render)
      → Cloud Storage   raw_sessions/{participantId}/{taskId}/{sessionId}.json   complete raw session JSON
      → Firestore       participants/{participantId}/taskRuns/{taskId}           participant/task/session index
```

Sessions used to be written only to `website_playground_server/collected_data/` on Render's local disk. The backend still writes that copy, but only as a temporary debug fallback: Render's local disk does not survive a redeploy, so Firebase is the source of truth. Only this backend talks to Firebase, through the Admin SDK; no Firebase credential is in the repository, the frontend or the extension.

**Cloud Storage** holds the complete session object as MORPH sent it (`events`, `groupedByStepId`, the oversight metrics, `modelUsage`, `study` and any other field), serialized as UTF-8 `application/json`. Nothing is removed, summarized or truncated.

**Firestore** holds a small index and never the events. Each `participants/{participantId}/taskRuns/{taskId}` document has `participantId`, `taskId`, `sessionId`, the `session.study` fields `participantGroup`, `assistiveTech`, `taskPrompt`, `targetUrl`, `oversightCondition`, `startedAt`, `endedAt` and `runStatus` (null when absent), `eventCount`, `uploadedAt` (client clock), `serverReceivedAt` (server clock, epoch ms) and `storagePath` (the Cloud Storage object). If a participant runs a task more than once, the top-level fields describe the most recently uploaded session, and the `sessions` map keeps one entry per sessionId (`startedAt`, `endedAt`, `runStatus`, `eventCount`, `serverReceivedAt`, `storagePath`), so every attempt stays in the index. The parent `participants/{participantId}` documents are not written; to list every task run, query the `taskRuns` collection group.

Upload rules:

- A session is identified by the request's top-level `participantId`, its `study.taskId` and its `sessionId`. Each ID must be 1–128 letters, digits, `.`, `_` or `-`, starting with a letter or digit, because it becomes a path segment.
- A formal session needs a `sessionId`, a `study.taskId` and a `study.participantId` equal to the request's `participantId`. A session missing any of them is rejected rather than filed under an unknown task or participant, and a different `study.participantId` is rejected rather than rewritten.
- Technical stubs are skipped, not rejected. MORPH exports also contain sessions that were opened and closed without a study task: they have no `study` block, or every `study` field is empty apart from `startedAt`, `endedAt` and `runStatus`. Such a session is not written to Firebase and does not fail the upload; it is logged and listed in the response's `skipped` array. Any other non-empty `study` value makes the session formal, with all the checks above.
- Sessions in one upload are handled independently: valid sessions are stored even when others in the same upload are rejected.
- Uploads are idempotent. The paths are deterministic, so re-uploading a session overwrites the same object and merges into the same document, and retrying after a failure is safe. The latest upload of a session replaces the stored copy.

Responses keep the shape the extension already reads. A session only counts as stored once both Firebase writes succeed; the local debug copy never makes `ok` true, and `storedCount` never includes skipped stubs.

| HTTP | Body | Meaning |
| ---- | ---- | ------- |
| 200  | `{"ok": true, "storedCount": n, "stored": [...]}`, plus `"skipped": [...]` when stubs were skipped | Every formal session is in Cloud Storage and Firestore. |
| 400  | `{"ok": false, "storedCount": k, "error": "...", "errors": [...]}` | The request, or some of its sessions, is invalid; `k` other sessions were stored. |
| 502  | Same as 400 | A Cloud Storage or Firestore write failed; retry. |
| 503  | Same as 400 | Firebase is not configured on the server. |

`GET /api/telemetry/health` returns `{"ok": true, "storage": "firebase", "firebaseConfigured": true, "dataDir": "..."}`. `firebaseConfigured` only checks that `FIREBASE_STORAGE_BUCKET` is set and that `GOOGLE_APPLICATION_CREDENTIALS` names an existing file; it calls no Firebase API and returns no setting values.

Upload bodies pass through the container's nginx, which accepts up to 32 MB (`client_max_body_size` in `nginx.conf`). nginx's 1 MB default had rejected long sessions with HTTP 413.

### Render configuration

| Setting | Value |
| ------- | ----- |
| Secret File `firebase-service-account.json` | The Firebase service-account key (JSON). Render exposes it at `/etc/secrets/firebase-service-account.json`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/firebase-service-account.json` |
| `FIREBASE_STORAGE_BUCKET` | `<configured Firebase bucket>`: the bucket name, without `gs://` |

Without these settings the server still starts, the study websites and the LLM proxy work, and telemetry uploads return 503. Never commit the key; `.gitignore` and `.dockerignore` exclude the usual key file names.

The Admin SDK bypasses Firebase Security Rules, so keep the Firestore and Storage rules denying all client access (`allow read, write: if false;`). Participant data is then unreachable through the public Firebase APIs, and uploads keep working.

### Backend tests

The tests replace Firebase with in-memory fakes, so they need no credentials or network access:

```bash
cd website_playground_server
pip install -r requirements.txt
python -m unittest -v
```

---

## Summary

- **Docker:** `docker build -t website-playground .` then `docker run -p 3000:3000 -p 8089:8089 website-playground` (add `-e OPENAI_API_KEY=your-key` only to enable LLM features). No `config.ini` needed.
- **Local:** Set `openai_api` (and optionally `openai_base_url` and `model`) in `website_playground_server/config.ini`, run `python main.py` in `website_playground_server`, then in `websites_playground` run `npm install`, `npm run build`, and `serve -s build`.

## Reference

If you use our tools/code for your work, please cite the following paper: [The Behavioral Fabric of LLM-Powered GUI Agents: Human Values and Interaction Outcomes](https://arxiv.org/abs/2601.16356)

```bibtex
@article{gebreegziabher2026behavioral,
  title={The Behavioral Fabric of LLM-Powered GUI Agents: Human Values and Interaction Outcomes},
  author={Gebreegziabher, Simret Araya and Yang, Yukun and Chiang, Charles and Yoo, Hojun and Chen, Chaoran and Do, Hyo Jin and Ashktorab, Zahra and Geyer, Werner and G{\'o}mez-Zar{\'a}, Diego and Li, Toby Jia-Jun},
  journal={Proceedings of the 31st International Conference on Intelligent User Interfaces (IUI)},
  year={2026}
}
```
