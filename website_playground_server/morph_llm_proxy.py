"""
MORPH LLM proxy: an OpenAI-compatible Chat Completions endpoint for the MORPH
extension, so study participants never configure an API key or a model.

	MORPH extension -> POST /api/llm/v1/chat/completions (this proxy) -> OpenAI

- The OpenAI key is the server-side OPENAI_API_KEY that main.py already
  resolves; it is only ever sent upstream, never returned to the client.
- The model and reasoning effort are pinned server-side: whatever the client
  sends for model / reasoning_effort / reasoning is discarded.
- Output tokens are capped (MORPH_LLM_MAX_OUTPUT_TOKENS) and requests are
  rate limited per client IP (MORPH_LLM_RATE_LIMIT_PER_MIN).
- Responses are relayed byte-for-byte, so streamed SSE chunks and the `usage`
  object reach MORPH unchanged (its model_usage telemetry depends on them).

Behind the Docker nginx, public /api/... is forwarded to the backend with the
/api prefix stripped, so the router is mounted under both /llm/v1 and
/api/llm/v1 (see main.py).
"""

import json
import os
import time
from collections import deque

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse


MORPH_MODEL = "gpt-6-luna"
MORPH_REASONING_EFFORT = "none"


def _positive_int_env(name: str, default: int) -> int:
	try:
		value = int(os.environ.get(name, "").strip())
	except ValueError:
		return default
	return value if value > 0 else default


MAX_OUTPUT_TOKENS = _positive_int_env("MORPH_LLM_MAX_OUTPUT_TOKENS", 4096)
RATE_LIMIT_PER_MINUTE = _positive_int_env("MORPH_LLM_RATE_LIMIT_PER_MIN", 120)
# MORPH may send page snapshots or screenshots, so allow fairly large bodies.
MAX_REQUEST_BYTES = _positive_int_env("MORPH_LLM_MAX_REQUEST_BYTES", 10 * 1024 * 1024)

# Client-supplied fields the proxy decides itself. max_tokens is replaced by
# max_completion_tokens (reasoning models reject max_tokens); n > 1 and
# service_tier would multiply or raise the cost of each call.
_SERVER_CONTROLLED_FIELDS = (
	"model",
	"reasoning_effort",
	"reasoning",
	"max_tokens",
	"max_completion_tokens",
	"n",
	"service_tier",
)

_UPSTREAM_TIMEOUT = httpx.Timeout(connect=10.0, read=180.0, write=30.0, pool=10.0)


class _SlidingWindowLimiter:
	"""In-memory per-key limiter; fine for the single uvicorn process in the container."""

	def __init__(self, limit: int, window_seconds: float = 60.0):
		self.limit = limit
		self.window = window_seconds
		self.hits: dict[str, deque] = {}

	def retry_after(self, key: str) -> float:
		"""Record a hit and return 0, or return the seconds to wait if over the limit."""
		now = time.monotonic()
		if len(self.hits) > 10000:
			self.hits = {k: q for k, q in self.hits.items() if q and now - q[-1] < self.window}
		q = self.hits.setdefault(key, deque())
		while q and now - q[0] >= self.window:
			q.popleft()
		if len(q) >= self.limit:
			return self.window - (now - q[0])
		q.append(now)
		return 0.0


def _client_ip(request: Request) -> str:
	# nginx (and Render's edge in front of it) append to X-Forwarded-For; the
	# first entry is the original client.
	forwarded = request.headers.get("x-forwarded-for", "")
	if forwarded:
		return forwarded.split(",")[0].strip()
	return request.client.host if request.client else "unknown"


def _error(status: int, message: str, code: str, err_type: str = "proxy_error", headers: dict | None = None) -> JSONResponse:
	# OpenAI-shaped error body so OpenAI SDK clients surface the message.
	return JSONResponse(
		status_code=status,
		content={"error": {"message": message, "type": err_type, "code": code}},
		headers=headers,
	)


def build_upstream_body(client_body: dict) -> dict:
	"""Copy the client's request, then pin model, reasoning effort and output cap."""
	body = {k: v for k, v in client_body.items() if k not in _SERVER_CONTROLLED_FIELDS}

	requested = client_body.get("max_completion_tokens", client_body.get("max_tokens"))
	cap = MAX_OUTPUT_TOKENS
	if isinstance(requested, int) and not isinstance(requested, bool) and requested > 0:
		cap = min(requested, MAX_OUTPUT_TOKENS)

	body["model"] = MORPH_MODEL
	body["reasoning_effort"] = MORPH_REASONING_EFFORT
	body["max_completion_tokens"] = cap

	if body.get("stream") is True:
		# Streams only carry usage when include_usage is set; default it on so
		# model_usage telemetry works, but respect an explicit client choice.
		options = body.get("stream_options")
		options = dict(options) if isinstance(options, dict) else {}
		options.setdefault("include_usage", True)
		body["stream_options"] = options
	else:
		body.pop("stream_options", None)
	return body


def create_morph_llm_router(api_key: str, base_url: str) -> APIRouter:
	router = APIRouter()
	limiter = _SlidingWindowLimiter(RATE_LIMIT_PER_MINUTE)
	completions_url = base_url.rstrip("/") + "/chat/completions"
	http_client: httpx.AsyncClient | None = None

	def scrub(text: str) -> str:
		return text.replace(api_key, "[redacted]") if api_key else text

	def map_upstream_error(status: int, content: bytes, headers: httpx.Headers) -> JSONResponse:
		try:
			upstream_error = json.loads(content).get("error") or {}
		except (ValueError, AttributeError):
			upstream_error = {}
		if not isinstance(upstream_error, dict):
			upstream_error = {}
		upstream_code = upstream_error.get("code") or ""
		upstream_message = scrub(str(upstream_error.get("message") or ""))
		print(f"[morph-llm] upstream HTTP {status} code={upstream_code!r}: {upstream_message[:300]}")

		if upstream_code == "model_not_found" or status == 404:
			return _error(503, f"The study model ({MORPH_MODEL}) is currently unavailable on the server's OpenAI account.", "model_unavailable")
		if status in (401, 403):
			# Never pass this body through: OpenAI echoes part of the rejected key.
			return _error(502, "The server's OpenAI credentials were rejected (authentication or configuration error). Contact the study team.", "upstream_auth_error")
		if status == 429:
			retry_after = headers.get("retry-after")
			if upstream_code == "insufficient_quota":
				return _error(429, "The server's OpenAI account has run out of quota. Contact the study team.", "insufficient_quota")
			return _error(429, "OpenAI rate limit reached; retry shortly.", "upstream_rate_limited", headers={"Retry-After": retry_after} if retry_after else None)
		if status >= 500:
			return _error(502, f"OpenAI returned a server error (HTTP {status}); retry shortly.", "upstream_error")
		# Remaining 4xx describe the client's request, so pass OpenAI's message on.
		return _error(
			status,
			upstream_message or f"OpenAI rejected the request (HTTP {status}).",
			upstream_code or "invalid_request",
			err_type=upstream_error.get("type") or "invalid_request_error",
		)

	@router.get("/health")
	async def morph_llm_health():
		configured = bool(api_key)
		return JSONResponse(
			status_code=200 if configured else 503,
			content={
				"ok": configured,
				"llmConfigured": configured,
				"model": MORPH_MODEL,
				"reasoningEffort": MORPH_REASONING_EFFORT,
				"maxOutputTokens": MAX_OUTPUT_TOKENS,
				"rateLimitPerMinute": RATE_LIMIT_PER_MINUTE,
				"streaming": True,
			},
		)

	@router.post("/chat/completions")
	async def morph_chat_completions(request: Request):
		nonlocal http_client
		if not api_key:
			return _error(503, "The LLM proxy is not configured: OPENAI_API_KEY is not set on the server.", "missing_api_key", err_type="server_config_error")

		wait = limiter.retry_after(_client_ip(request))
		if wait > 0:
			seconds = max(1, int(wait + 0.999))
			return _error(429, f"Too many LLM requests from this client; retry in {seconds}s.", "proxy_rate_limited", headers={"Retry-After": str(seconds)})

		raw = await request.body()
		if len(raw) > MAX_REQUEST_BYTES:
			return _error(413, f"Request body exceeds {MAX_REQUEST_BYTES} bytes.", "request_too_large", err_type="invalid_request_error")
		try:
			client_body = json.loads(raw)
		except ValueError:
			return _error(400, "Request body must be JSON.", "invalid_json", err_type="invalid_request_error")
		if not isinstance(client_body, dict) or not isinstance(client_body.get("messages"), list) or not client_body["messages"]:
			return _error(400, "Request must be a JSON object with a non-empty 'messages' array.", "invalid_request", err_type="invalid_request_error")

		upstream_body = build_upstream_body(client_body)
		streaming = upstream_body.get("stream") is True

		if http_client is None:
			http_client = httpx.AsyncClient(timeout=_UPSTREAM_TIMEOUT)
		upstream_request = http_client.build_request(
			"POST",
			completions_url,
			json=upstream_body,
			headers={"Authorization": f"Bearer {api_key}"},
		)
		try:
			upstream = await http_client.send(upstream_request, stream=True)
		except httpx.TimeoutException:
			return _error(504, "Timed out connecting to OpenAI.", "upstream_timeout")
		except httpx.HTTPError as e:
			print(f"[morph-llm] upstream network error: {scrub(repr(e))}")
			return _error(502, "Could not reach OpenAI (network error).", "upstream_unreachable")

		passthrough_headers = {}
		if upstream.headers.get("x-request-id"):
			passthrough_headers["x-request-id"] = upstream.headers["x-request-id"]

		if upstream.status_code >= 400 or not streaming:
			try:
				content = await upstream.aread()
			except httpx.HTTPError:
				await upstream.aclose()
				return _error(502, "Connection to OpenAI dropped while reading the response.", "upstream_unreachable")
			await upstream.aclose()
			if upstream.status_code >= 400:
				return map_upstream_error(upstream.status_code, content, upstream.headers)
			return Response(content=content, status_code=upstream.status_code, media_type="application/json", headers=passthrough_headers)

		async def relay():
			try:
				async for chunk in upstream.aiter_bytes():
					yield chunk
			except httpx.HTTPError as e:
				print(f"[morph-llm] stream interrupted: {scrub(repr(e))}")
				error = {"error": {"message": "Connection to OpenAI dropped mid-stream.", "type": "proxy_error", "code": "upstream_stream_interrupted"}}
				yield f"data: {json.dumps(error)}\n\n".encode()
			finally:
				await upstream.aclose()

		return StreamingResponse(
			relay(),
			media_type="text/event-stream",
			headers={
				**passthrough_headers,
				"Cache-Control": "no-cache",
				# Stop nginx from buffering the stream (proxy_buffering is on by default).
				"X-Accel-Buffering": "no",
			},
		)

	return router
