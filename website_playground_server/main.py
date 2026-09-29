import json
import os
import re
import time
import uvicorn
import configparser

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

from openai import OpenAI

import firebase_store
from morph_llm_proxy import create_morph_llm_router

import tiktoken


# Provider: OpenAI (was DeepSeek). Legacy deepseek_* config keys are still
# read as fallbacks so an old config.ini keeps working. The API key comes
# from the OPENAI_API_KEY env var or the gitignored config.ini — never from
# source code.
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'config.ini')
config.read(config_path)


def _config_value(*keys: str, fallback: str = "") -> str:
	for key in keys:
		value = config.get("settings", key, fallback="")
		value = value.split('#')[0].strip()
		if value:
			return value
	return fallback


API_KEY = os.environ.get("OPENAI_API_KEY", "").strip() or _config_value("openai_api", "deepseek_api")
# openai>=1.0 expects the versioned base URL (".../v1"); do not strip it.
LLM_BASE_URL = os.environ.get("OPENAI_BASE_URL", "").strip() or _config_value("openai_base_url", "deepseek_base_url", fallback="https://api.openai.com/v1")
LLM_MODEL = os.environ.get("OPENAI_MODEL", "").strip() or _config_value("model", "openai_model", fallback="gpt-4o-mini")

# Explicit client: the legacy module-level shim (openai.api_key/base_url)
# does not reliably configure requests in openai>=2.x.
# The LLM is optional: the study's static sites and MORPH telemetry must run
# without a key, so with no key configured the client stays None and the LLM
# endpoints return 503 instead of attempting a request.
llm_client = OpenAI(api_key=API_KEY, base_url=LLM_BASE_URL) if API_KEY else None
if llm_client is None:
	print("No OpenAI API key configured: LLM endpoints disabled (static sites and telemetry unaffected).")


def _llm_disabled_response() -> JSONResponse:
	return JSONResponse(
		status_code=503,
		content={"error": "LLM functionality is disabled on this deployment."},
	)

app = FastAPI()


app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# MORPH LLM proxy (see morph_llm_proxy.py). Reuses the same server-side key
# and base URL as the endpoints below. Mounted twice because nginx strips the
# public /api prefix: /api/llm/v1/... reaches the backend as /llm/v1/....
morph_llm_router = create_morph_llm_router(API_KEY, LLM_BASE_URL)
app.include_router(morph_llm_router, prefix="/llm/v1")
app.include_router(morph_llm_router, prefix="/api/llm/v1")

BATCH_SIZE = 20


def num_tokens_from_string(string: str, encoding_name: str = 'cl100k_base') -> int:
	try:
		encoding = tiktoken.get_encoding(encoding_name)
	except KeyError:
		encoding = tiktoken.encoding_for_model(encoding_name)
	return len(encoding.encode(string))

@app.post("/get_llm_recs")
async def get_llm_rec(request: Request):
	"""
	Endpoint to get LLM recommendations based on a query.
	"""
	if llm_client is None:
		return _llm_disabled_response()
	# Parse request body
	data = await request.json()
	query = data.get("query")
	filename = data.get("filename", "default")
	summaries = data.get("summaries", [])
	print(data)

	#check for cache hit 
	cache_key = f"{query}_{filename}"
	cache_file = f"cache/{cache_key}.json"
	if os.path.exists(cache_file):
		print(f"Cache hit for {cache_key}, loading from {cache_file}")
		with open(cache_file, "r") as f:
			cached_data = json.load(f)
		return {
			"query": cached_data["query"],
			"recommendation": cached_data["results"]
		}
	else:
		print(f"Cache miss for {cache_key}, processing query.")
	
		print("Received query:", query)
		masked_key = API_KEY[:6] + "..." + API_KEY[-4:] if API_KEY and len(API_KEY) > 10 else "***"
		print(f"LLM provider key: {masked_key} (model={LLM_MODEL})")
	# print("File name:", filename)
	# print("summaries", summaries)

	system = '''
			You are re-ranking shopping/search snippets for relevance and usefulness.
			Score each item 0–100 for how well it satisfies the user's query.
			Consider exact/semantic match, key specs, price/value, quality signals, and any constraints in the query.
			Return STRICT JSON: {"ranked":[{"idx":<number>,"score":<0-100>,"reason":"<short>"}]}. No extra text.'''

	if summaries:
		print("Summaries provided, using them to create batch.")
		batch = [{"idx": idx, "summary": summary} for idx, summary in enumerate(summaries)]
		#only use the first 20 summaries
		batch = batch[:BATCH_SIZE]
		print("Batch created with summaries:", len(batch))
		user = f'''User query: "{query}"
			Snippets (JSON): {json.dumps(batch)}'''
	else:
		batch = []
		user = f'''User query: "{query}"
			No snippets provided. If possible, respond with an empty ranked list.'''


	messages = [ { "role": "system", "content": system },{ "role": "user", "content": user }]

	#check token length and reduce if necessary
	total_tokens = sum(num_tokens_from_string(m['content']) for m in messages)
	print(f"Total tokens in messages: {total_tokens}")
	if total_tokens > 110000:
		print("Token limit exceeded, trimming summaries.")
		#trim summaries to fit within token limit
		while total_tokens > 110000 and len(batch) > 1:
			batch.pop()
			user = f'''User query: "{query}"
				Snippets (JSON): {json.dumps(batch)}'''
			messages = [ { "role": "system", "content": system },{ "role": "user", "content": user }]
			total_tokens = sum(num_tokens_from_string(m['content']) for m in messages)
			print(f"Trimmed batch to {len(batch)} items, total tokens now {total_tokens}")
		if total_tokens > 110000:
			print("Still over token limit after trimming, returning error.")
			return {"error": "Query too long even after trimming summaries."}
		else:
			print(f"Final batch size after trimming: {len(batch)}, total tokens: {total_tokens}")
	else:
		print("Token count within limit, proceeding.")
	


	# call openai API
	response = llm_client.chat.completions.create(
		model=LLM_MODEL,
		messages=messages,
		temperature=0.0
	)

	content = response.choices[0].message.content

	#parse the content into json
	try:
		content = json.loads(content)
	except json.JSONDecodeError as e:
		print("Error decoding JSON:", e)
		print("Content received:", content)
		return {"error": "Invalid JSON response from LLM"}
	
	if "ranked" not in content:
		print("Invalid response format from LLM, expected 'ranked' key.")
		return {"error": "Invalid response format from LLM"}
	if not isinstance(content["ranked"], list):
		print("Invalid response format from LLM, 'ranked' should be a list.")
		return {"error": "Invalid response format from LLM"}
	if len(content["ranked"]) == 0:
		print("No ranked items returned by LLM.")
		return {"error": "No ranked items returned by LLM"}
	

	
	print("LLM response content:", content)
	

	score_map = {}
	for r in (content.get("ranked") or []):
		idx = int(r.get("idx", -1))
		score = max(0, min(1, float(r.get("score", 0))))  # mimic clamp
		reason = str(r.get("reason", ""))

		if isinstance(idx, int):
			score_map[idx] = {"score": score, "reason": reason}

	merged = []
	for s in summaries:
		entry = score_map.get(s["idx"])
		merged.append({
			"idx": s["idx"],
			"html": s["html"],
			"summary": s["summary"],
			"score": entry["score"] if entry else 0,
			"reason": entry["reason"] if entry else "No LLM score (fallback).",
		})

	# Sort: first by score descending, then by idx ascending
	merged.sort(key=lambda x: (-x["score"], x["idx"]))

	# cache the results with the query and filename
	cache_key = f"{query}_{filename}"
	cache_file = f"cache/{cache_key}.json"
	if not os.path.exists("cache"):
		os.makedirs("cache")
	with open(cache_file, "w") as f:
		json.dump({
			"query": query,
			"filename": filename,
			"summaries": summaries,
			"results": merged
		}, f, indent=2)
	print(f"Results cached to {cache_file}")


	# Create final response

	response = {
		"query": query,
		"recommendation": merged

	}

	return response


@app.post("/generatePage")
async def generate_dynamic_page(request: Request):
    """
    Generate a dynamic web page HTML snippet for a given page title.
    """
    if llm_client is None:
        return _llm_disabled_response()
    data = await request.json()
    page_name = data.get("pageName", "Untitled Page")
    site_context = data.get("siteContext", """
    - The site is called RiverBuy, a clone of Amazon.
    - Built using Tailwind CSS.
    - Pages include a top header with logo, search bar, cart, and account.
    - Navigation bar has sections like "Gift Cards", "Today's Deals", etc.
    - Main content often includes product grids, promo banners, FAQs.
    - Design is responsive, e-commerce themed, and clean.
    """)

    system_prompt = "You are a helpful HTML generator for an e-commerce site styled with Tailwind CSS."
    user_prompt = f"""
    Website context:
    {site_context.strip()}

    Please generate a high-quality HTML snippet for a page titled "{page_name}". 
    Include appropriate e-commerce content: e.g., hero banner, description, possible offers, and some dummy products or FAQs.

    Use Tailwind CSS for styling and return ONLY the inner HTML (no <html>, <head>, etc.).
    Make sure it's a <div> or group of <div>s that can be injected directly into a React page.
    """

    # Send to the OpenAI-compatible chat completions API
    try:
        response = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        generated_html = response.choices[0].message.content
        return {
            "pageName": page_name,
            "html": generated_html.strip()
        }

    except Exception as e:
        print("LLM error:", str(e))
        return {"error": f"Failed to generate page: {str(e)}"}


@app.post("/pickBestFile")
async def pick_best_file(request: Request):
	"""
	Pick the single most relevant filename from a list for a user's query.
	Uses the API key from config.ini; no key needed from the frontend.
	"""
	if llm_client is None:
		return _llm_disabled_response()
	data = await request.json()
	query = (data.get("query") or "").strip()
	candidates = data.get("candidates") or []
	# Always use the server-configured model: old frontends still send
	# "deepseek-chat", which the OpenAI API would reject.
	model = LLM_MODEL

	if not query or not candidates:
		return {"best": None}

	system = (
		"You pick the SINGLE most relevant filename from a list for a user's shopping/search query.\n"
		"Prefer exact topical fit (e.g., milk vs shoes), then specificity.\n"
		'Return STRICT JSON: {"best":"<one of the provided filenames>","reason":"<short>"} — no extra text.'
	)
	user = f'Query: "{query}"\nCandidates (JSON array): {json.dumps(candidates)}\nPick exactly one "best" from the list.'

	try:
		response = llm_client.chat.completions.create(
			model=model,
			messages=[
				{"role": "system", "content": system},
				{"role": "user", "content": user},
			],
			temperature=0,
			max_tokens=256,
		)
		content = response.choices[0].message.content or "{}"
		parsed = json.loads(content)
		best = parsed.get("best")
		reason = parsed.get("reason", "")
		if best and best in candidates:

			print("pickBestFile response:", {"best": best, "reason": reason})
			return {"best": best, "reason": reason}
	except (json.JSONDecodeError, Exception) as e:
		print("pickBestFile error:", e)
	return {"best": None}


# ── MORPH telemetry ingestion ────────────────────────────────────────────────
# The MORPH extension uploads study session logs here. Firebase is the
# persistent store (see firebase_store.py): the complete session JSON goes to
# Cloud Storage and a metadata index to Firestore, and a session only counts
# as stored once both writes succeed. Each session is also still written to
# TELEMETRY_DATA_DIR (default: ./collected_data) as before, but only as a
# temporary debug copy: Render's local disk does not survive a redeploy.

TELEMETRY_DATA_DIR = os.environ.get(
	"TELEMETRY_DATA_DIR",
	os.path.join(os.path.dirname(__file__), "collected_data"),
)

_SAFE_SEGMENT = re.compile(r"[^A-Za-z0-9._-]")

_firebase_missing = firebase_store.missing_settings()
if _firebase_missing:
	print(f"Firebase telemetry storage is not configured ({'; '.join(_firebase_missing)}): telemetry uploads will return 503.")


def _safe_path_segment(value: str, fallback: str) -> str:
	cleaned = _SAFE_SEGMENT.sub("_", (value or "").strip())[:80]
	return cleaned or fallback


def store_session_payload(participant_id: str, session_id: str, payload: dict) -> str:
	"""Write the local debug copy of one session; returns its path.

	Firebase (firebase_store.save_task_run) is the persistent store; this
	copy on Render's ephemeral disk is only for debugging.
	"""
	participant_dir = os.path.join(TELEMETRY_DATA_DIR, _safe_path_segment(participant_id, "unknown_participant"))
	os.makedirs(participant_dir, exist_ok=True)
	filename = f"{_safe_path_segment(session_id, 'session')}.json"
	path = os.path.join(participant_dir, filename)
	with open(path, "w") as f:
		json.dump(payload, f, indent=2)
	return path


def _store_session(index: int, session, participant_id: str, uploaded_at, received_at: int, firebase_error: str | None) -> tuple[str, int, dict]:
	"""Store one uploaded session; returns (outcome, HTTP status, result entry).

	outcome is "stored", "skipped" (a technical stub, see
	firebase_store.is_technical_stub) or "error". Does blocking disk and
	network I/O, so the endpoint runs it in a worker thread and other requests
	(such as MORPH LLM streams) keep moving.
	"""
	if not isinstance(session, dict):
		return "error", 400, {"index": index, "sessionId": None, "error": "Session is not a JSON object"}
	raw_session_id = session.get("sessionId")
	result = {"index": index, "sessionId": raw_session_id if isinstance(raw_session_id, str) else None}

	# The debug copy is written as before, even for sessions Firebase rejects below.
	local_session_id = str(raw_session_id or f"session_{int(time.time() * 1000)}")
	envelope = {"participantId": participant_id, "receivedAt": received_at, "session": session}
	try:
		path = store_session_payload(participant_id, local_session_id, envelope)
		print(f"[telemetry] debug copy of session {local_session_id} for {participant_id} -> {path}")
	except Exception as e:
		print(f"[telemetry] debug copy of session {local_session_id} for {participant_id} failed: {e!r}")

	try:
		ids = firebase_store.task_run_ids(participant_id, session)
	except firebase_store.TelemetryValidationError as e:
		return "error", 400, {**result, "error": str(e)}
	if ids is None:
		events = session.get("events")
		event_count = len(events) if isinstance(events, list) else None
		print(f"[telemetry] skipped technical stub session {result['sessionId']} from {participant_id}: empty study metadata, eventCount={event_count}")
		return "skipped", 200, {**result, "reason": "Technical stub: empty study metadata", "eventCount": event_count}
	task_id, session_id = ids
	if firebase_error:
		return "error", 503, {**result, "error": firebase_error}
	try:
		paths = firebase_store.save_task_run(
			participant_id, task_id, session_id, session, uploaded_at=uploaded_at, received_at=received_at
		)
	except firebase_store.FirebaseWriteError as e:
		print(f"[telemetry] Firebase write failed for {participant_id}/{task_id}/{session_id}: {e.__cause__!r}")
		return "error", 502, {**result, "error": str(e)}
	print(f"[telemetry] stored session {session_id} for {participant_id}/{task_id} -> {paths['storagePath']}")
	return "stored", 200, {"sessionId": session_id, "taskId": task_id, **paths}


def _telemetry_failure(status: int, message: str) -> JSONResponse:
	print(f"[telemetry] upload rejected (HTTP {status}): {message}")
	return JSONResponse(status_code=status, content={"ok": False, "storedCount": 0, "error": message})


def _failure_summary(stored_count: int, skipped_count: int, total: int, errors: list[dict]) -> str:
	"""One sentence per distinct problem, listing the sessions it affected."""
	affected: dict[str, list[str]] = {}
	for error in errors:
		label = f"sessions[{error['index']}]" + (f" {error['sessionId']}" if error["sessionId"] else "")
		affected.setdefault(error["error"], []).append(label)
	details = " ".join(f"{', '.join(labels)}: {message}." for message, labels in affected.items())
	formal = total - skipped_count
	summary = f"Stored {stored_count} of {formal} session{'' if formal == 1 else 's'} in Firebase"
	if skipped_count:
		summary += f" and skipped {skipped_count} technical stub{'' if skipped_count == 1 else 's'}"
	return f"{summary}. {details}"


@app.get("/telemetry/health")
async def telemetry_health():
	# A configuration check only: it calls no Firebase API and returns no setting values.
	return {
		"ok": True,
		"storage": "firebase",
		"firebaseConfigured": not firebase_store.missing_settings(),
		"dataDir": TELEMETRY_DATA_DIR,
	}


@app.post("/telemetry/sessions")
async def upload_telemetry_sessions(request: Request):
	"""
	Accepts a batch of MORPH session logs:
	{ "participantId": "P67", "uploadedAt": 123, "sessions": [ { "sessionId": "...", "study": { "taskId": "...", ... }, ... }, ... ] }
	Each session goes to Firebase under participantId + study.taskId + sessionId;
	re-uploads rewrite the same Storage object and Firestore document (idempotent).
	Technical stubs (sessions with empty study metadata) are not stored; they
	are listed under "skipped" and do not fail the upload.
	Returns {"ok": true, "storedCount": n} only when every other session reached
	Firebase; otherwise HTTP 400/502/503 with ok false, the number stored and an error.
	"""
	try:
		data = await request.json()
	except ValueError:
		return _telemetry_failure(400, "Request body must be valid JSON.")
	if not isinstance(data, dict):
		return _telemetry_failure(400, "Request body must be a JSON object.")
	try:
		participant_id = firebase_store.require_id(data.get("participantId"), "participantId")
	except firebase_store.TelemetryValidationError as e:
		return _telemetry_failure(400, f"{e}.")
	sessions = data.get("sessions")
	if not isinstance(sessions, list) or len(sessions) == 0:
		return _telemetry_failure(400, "No sessions provided.")

	try:
		await run_in_threadpool(firebase_store.connect)
		firebase_error = None
	except firebase_store.FirebaseUnavailableError as e:
		firebase_error = str(e)

	received_at = int(time.time() * 1000)
	status, stored, skipped, errors = 200, [], [], []
	for index, session in enumerate(sessions):
		outcome, code, result = await run_in_threadpool(
			_store_session, index, session, participant_id, data.get("uploadedAt"), received_at, firebase_error
		)
		status = max(status, code)  # 503 (not configured) > 502 (write failed) > 400 (invalid session)
		if outcome == "stored":
			stored.append(result)
		elif outcome == "skipped":
			skipped.append(result)
		else:
			errors.append(result)

	if not errors:
		body = {"ok": True, "storedCount": len(stored), "stored": stored}
	else:
		for error in errors:
			print(f"[telemetry] sessions[{error['index']}] from {participant_id} not stored in Firebase: {error['error']}")
		body = {
			"ok": False,
			"storedCount": len(stored),
			"error": _failure_summary(len(stored), len(skipped), len(sessions), errors),
			"stored": stored,
			"errors": errors,
		}
	if skipped:
		body["skipped"] = skipped
	return JSONResponse(status_code=status, content=body)


if __name__ == "__main__":
	print("running main")
	uvicorn.run("main:app", port=8089, host="0.0.0.0", log_level="info", reload=True, workers=4)