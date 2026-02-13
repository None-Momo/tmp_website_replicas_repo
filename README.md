# LLM-agents-website-replicas

# Website Playground

This project runs a **frontend** (React app) and a **backend** (FastAPI server) that use a DeepSeek-compatible API for LLM recommendations and page generation. You can run everything with **Docker** (one container) or **locally** (two processes).

(More details on supported tasks can be found in the paper)(https://arxiv.org/abs/2601.16356)

## Table of contents

- [Option 1: Run with Docker (Recommended)](#option-1-run-with-docker-(Recommended))
- [Option 2: Run locally](#option-2-run-locally)
- [Ports and URLs](#ports-and-urls)
- [Available frontend routes](#available-frontend-routes)
- [Configuration reference](#configuration-reference)

---

## Option 1: Run with Docker (Recommended)

Docker builds the frontend, runs the backend and nginx in one container, and generates `config.ini` from environment variables at startup. No API key is stored in the image.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- A [DeepSeek API key](https://platform.deepseek.com/) (or compatible API key)

### Build the image

From this directory:

```bash
docker build -t website-playground .
```

### Run the container

You **must** pass your API key via the `DEEPSEEK_API_KEY` environment variable:

```bash
docker run -p 3000:3000 -p 8089:8089 -e DEEPSEEK_API_KEY=your-api-key-here website-playground
```

Replace `your-api-key-here` with your real key.

**Optional:** If your API uses a different base URL (e.g. a proxy or another provider):

```bash
docker run -p 3000:3000 -p 8089:8089 \
  -e DEEPSEEK_API_KEY=your-api-key-here \
  -e DEEPSEEK_BASE_URL=https://your-api-base.com \
  website-playground
```

If you omit `DEEPSEEK_BASE_URL`, it defaults to `https://api.deepseek.com`.

### Access the app

- **Frontend (UI):** http://localhost:3000
- **Backend API:** http://localhost:8089/docs

The frontend calls the backend on port 8089 for LLM endpoints; nginx in the container proxies `/api/*` to the backend for all routes.

### Docker notes

- The container exits with an error if `DEEPSEEK_API_KEY` is not set.
- To run in the background: add `-d` (e.g. `docker run -d -p 3000:3000 -p 8089:8089 -e DEEPSEEK_API_KEY=... website-playground`).
- To use different host ports: e.g. `-p 8080:3000 -p 9090:8089` maps frontend to 8080 and backend to 9090.

---

## Option 2: Run locally

You can run the **backend** and **frontend** as two separate processes. The backend needs a `config.ini` with your API key; the frontend is built and served with Node.

### Prerequisites

- **Backend:** Python 3.12+ and `pip`
- **Frontend:** Node.js 18+ and `npm`
- A DeepSeek (or compatible) API key

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

| Variable            | Required | Default                    | Description                          |
| ------------------- | -------- | -------------------------- | ------------------------------------ |
| `DEEPSEEK_API_KEY`  | Yes      | —                          | API key; written into `config.ini`.  |
| `DEEPSEEK_BASE_URL` | No       | `https://api.deepseek.com` | API base URL for the backend client. |

### Local (`website_playground_server/config.ini`)

| Key                 | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `deepseek_api`      | Your DeepSeek (or compatible) API key.                |
| `deepseek_base_url` | Optional; API base URL (defaults in code if missing). |

---

## Summary

- **Docker:** `docker build -t website-playground .` then `docker run -p 3000:3000 -p 8089:8089 -e DEEPSEEK_API_KEY=your-key website-playground`. No `config.ini` needed; key is passed at run time.
- **Local:** Set `deepseek_api` (and optionally `deepseek_base_url`) in `website_playground_server/config.ini`, run `python main.py` in `website_playground_server`, then in `websites_playground` run `npm install`, `npm run build`, and `serve -s build`.

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
