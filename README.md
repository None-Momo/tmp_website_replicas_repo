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
- [StayScape saved searches](#stayscape-saved-searches)
- [StayScape search, flights and trip itinerary](#stayscape-search-flights-and-trip-itinerary)
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
| `/stayscape_saved` | StayScapeSavedSearches | StayScape saved searches, see [below](#stayscape-saved-searches) |
| `/itinerary` | ItineraryPage | trip itinerary shared by the flight site and StayScape, see [below](#stayscape-search-flights-and-trip-itinerary) |
| `/dwellio`   | Dwellio             | zillow replica home    |
| `/done`      | DonePage            | completion page        |

## StayScape saved searches

StayScape has a **Saved searches** area for the "modify existing content" study task. The "Saved searches" link in the header of every StayScape page leads to it.

| Path                         | Purpose                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/stayscape_saved`           | Lists every saved search with its destination, dates and maximum budget, with View details and Edit links.    |
| `/stayscape_saved/:id`       | Shows the persisted conditions of one saved search, with an Edit link.                                        |
| `/stayscape_saved/:id/edit`  | Form with Search name, Destination, Check-in date, Check-out date and Maximum budget; Save changes, Cancel editing. |
| `/stayscape_study_reset`     | For study staff only and not linked from the site. Restores the initial saved searches when its button is pressed. |

The data lives in the browser's `localStorage` under the key `stayscape.savedSearches` (see `websites_playground/src/StayScape/StayScape_savedsearch_data.ts`). The initial record is written only when that key is absent, so edits survive navigation, page refreshes and remounts, and nothing resets on its own. Saving replaces the record in place and never adds one. There is no server-side copy: each browser profile and each origin (for example `http://localhost:3000` and `http://127.0.0.1:3001`) keeps its own data.

### Automatic initialization for each MORPH run

MORPH starts each new Task 1 run by opening:

```
/stayscape?study_init=stayscape_saved_01&study_run_id=<unique id>
```

The first time StayScape sees a run id for `stayscape_saved_01`, it restores the saved searches to the initial state below. This happens synchronously while the home page first renders, before anything is shown. The id is then recorded under the `localStorage` key `stayscape.studyInit`, which remembers the 500 most recent ids. Any later visit with the same id does nothing, including refreshing the start URL, pressing Back to it, or opening it again, so the run's own edit to $180 survives. A new id restores $220.

Nothing else resets: visits without both parameters, an unknown `study_init` value, and the parameters on any page other than `/stayscape` are ignored. Only `stayscape.savedSearches` is reset; the itinerary is never touched. The record lives in the same browser profile as the data, so ids are tracked per profile. The manual reset page below remains as a fallback, and it shows the last automatically initialized run id.

### Initial state

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Search name    | Seattle Winter Trip                |
| Destination    | Seattle                            |
| Check-in date  | 2026-12-10 (December 10, 2026)     |
| Check-out date | 2026-12-15 (December 15, 2026)     |
| Maximum budget | $220 (USD)                         |

### Resetting before a session

Reset in the browser profile the participant will use, on the origin that serves the study site, before every session, so that all three MORPH interaction modes start from identical data.

1. Open `<site>/stayscape_study_reset`, for example `http://localhost:3000/stayscape_study_reset`.
2. Read the "Current saved searches" section, then press **Reset saved searches to initial state**. The page announces "Saved searches were reset to their initial state." and the current list shows Seattle Winter Trip with a $220 maximum budget.
3. Check the **Task 1 readiness** box. It must say "Ready: the saved searches match the initial state. Seattle Winter Trip has a maximum budget of $220."
4. Close every StayScape tab left from the previous run, then open the task's start page in a new tab. Do not press Back to return to an earlier page.

Saved values persist by design: if the reset is skipped, the next run sees the previous run's $180. The reset must be done in the same browser profile MORPH uses, on `https://morph-fake-websites.onrender.com`; another profile, an incognito window or `localhost` has separate storage. Saved-search and itinerary pages re-read storage when another tab changes it and when the browser restores a page from its back-forward cache, so a page left open during a reset updates itself to the reset values.

Opening the reset page changes nothing by itself; only the button writes. The reset replaces the saved-searches key only, so other browser data is left alone, and it can be repeated any number of times without creating duplicates.

Alternative without the page: in the browser's DevTools console run `localStorage.removeItem('stayscape.savedSearches')` and reload. The next saved-search page recreates the initial record. Clearing all site data for the origin also works, but removes the other replica sites' `localStorage` too.

## StayScape search, flights and trip itinerary

These features support the cross-site study task (flight site, then StayScape, then the itinerary). All the replica sites are routes of one React app on one origin, so they share the browser's `localStorage`.

### Flight site

- Each result and details page shows the flight number, departure and arrival cities, departure date and time, and arrival date and time. Times are local to each airport.
- The departure date is the one chosen on the search page. The scraped results stand for flights on that date; they are not filtered by date.
- The arrival date is the departure date plus the day offset in the scraped itinerary label ("Leaves ... on Monday, September 22 and arrives ... on Tuesday, September 23"). That offset already reflects overnight flying and time zones, so a flight shown as "+1 day" arrives on the next calendar day.
- Flight numbers are mock values: the scraped data has none. They are derived deterministically from each flight's airline, airports and times, so they are the same in every session.
- The scraped Chicago and New York files list every flight twice. The parser keeps the first copy, so the results show 29 and 23 flights.
- One Chicago flight is a hand-added mock record, so that an O'Hare departure arrives on the next calendar day: Prairie Air (code P9, fictional), nonstop ORD 10:45 PM to LAX 1:00 AM next day, 4 hr 15 min, $239. That matches the time zones (10:45 PM CST is 04:45 UTC; plus 4 h 15 min is 09:00 UTC, which is 1:00 AM PST). It was cloned from a scraped card in `flight_ORDLAX_results.txt` (both copies), so it is parsed like every other flight; every other ORD departure arrives the same day.
- The results page has a **Departure time** filter with two sliders, "Departs at or after" and "Departs at or before" (whole hours, local to the departure airport; the end hour includes its :59 minute; an end earlier than the start covers overnight departures). Departure times are read with their AM/PM.
- The details URL is `/flight_details/<slug>?date=YYYY-MM-DD`. Older slugs without the flight number still resolve to the first matching flight.
- The details page has **Add to itinerary**, which records the flight with its dates.

### StayScape search

- Listings come from `websites_playground/src/StayScape/StayScape_listings_data.ts`. Honolulu and New York rows are the scraped Airbnb cards. The nightly price is the scraped total divided by the scraped number of nights. Amenities are mock values, assigned deterministically, except that a listing whose name advertises parking or a pool always has it. Los Angeles (12 listings) and Singapore (8 listings) are hand-written mock listings without photos.
- A search shows only the requested city. "Los Angeles", "Los Angeles, CA", "Los Angeles (LAX)" and "LA" all match Los Angeles. A place with no listings shows "No matching accommodations found" instead of another city's stays.
- **Dates:** check-out must be after check-in, on the home page, the results page and the details page. No listing has availability limits, so dates do not hide listings; they set the number of nights and the total price shown on each card and details page.
- **Filters** on the results page: "Maximum price per night (USD)" (whole dollars, inclusive) and the amenities Wi-Fi, Parking, Breakfast, Swimming pool and Air conditioning. A stay must have every selected amenity. Filters apply as soon as they change, and the page states the number of stays shown and the filters in effect.
- The destination, dates, guests and filters are kept in the URL, so they survive a refresh, Back, and a visit to a listing.
- The details page shows the stay's dates (editable), nights, total, and amenities, and has **Add to itinerary**. Details URLs from the earlier HTML-card version still resolve.
- New searches never read saved searches: the home and results forms start from the URL only.

### Trip itinerary

`/itinerary` shows the recorded flight and stay with every field, and has **Remove** buttons. The **Itinerary** link is in the StayScape header and on the flight results and details pages. Adding a flight or stay when one is already recorded replaces it. The itinerary is stored under the `localStorage` key `trip.itinerary`; its initial state is empty. Nothing is added automatically.

### Preparing a session

Do both resets in the participant's browser profile, on the study origin, before every session. Each reset touches only its own key.

1. **Task 1:** open `<site>/stayscape_study_reset` and press **Reset saved searches to initial state** (see [StayScape saved searches](#stayscape-saved-searches)).
2. **Task 2:** open `<site>/itinerary_study_reset` and press **Reset itinerary to initial state**. The page announces "The itinerary was reset to its initial, empty state." and lists "Flight: none" and "Stay: none".
3. Open the task's start page in a new tab. Search conditions and filters live in the URL and the flight results in tab history, so a fresh tab starts clean.

Without the pages, run `localStorage.removeItem('trip.itinerary')` (and `localStorage.removeItem('stayscape.savedSearches')` for Task 1) in the DevTools console.

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
