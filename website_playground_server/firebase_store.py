"""
Firebase persistence for MORPH telemetry uploads (POST /telemetry/sessions in
main.py). Only this backend talks to Firebase, through the Admin SDK.

	Cloud Storage  raw_sessions/{participantId}/{taskId}/{sessionId}.json
	               the complete session object as MORPH sent it
	Firestore      participants/{participantId}/taskRuns/{taskId}
	               a small metadata index that points at the raw object

- Credentials come from Application Default Credentials. On Render,
  GOOGLE_APPLICATION_CREDENTIALS names a Secret File holding the
  service-account key; no key lives in the repository or reaches a response.
- FIREBASE_STORAGE_BUCKET names the bucket. Without it the server still
  starts, and uploads fail with a 503 that names the missing setting.
- Both paths derive from participantId + taskId + sessionId, so a retried
  upload rewrites the same object and document instead of adding a duplicate.
"""

import json
import os
import re
import threading

import firebase_admin
from firebase_admin import firestore, storage


# IDs become Storage path segments and Firestore document IDs, where "/" would
# add path levels, so unsafe IDs are rejected rather than rewritten.
_ID_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}")


class TelemetryValidationError(ValueError):
	"""The upload is invalid; sending the same data again fails the same way."""


class FirebaseUnavailableError(RuntimeError):
	"""Firebase is not configured on this server (bucket name or credentials)."""


class FirebaseWriteError(RuntimeError):
	"""A Cloud Storage or Firestore call failed; retrying the upload is safe."""


def storage_path(participant_id: str, task_id: str, session_id: str) -> str:
	return f"raw_sessions/{participant_id}/{task_id}/{session_id}.json"


def firestore_path(participant_id: str, task_id: str) -> str:
	return f"participants/{participant_id}/taskRuns/{task_id}"


def require_id(value, field: str) -> str:
	"""Return the trimmed ID, or raise if it is missing or unsafe as a path segment."""
	if value is None or (isinstance(value, str) and not value.strip()):
		raise TelemetryValidationError(f"Missing {field}")
	if not isinstance(value, str):
		raise TelemetryValidationError(f"{field} must be a string")
	value = value.strip()
	if not _ID_PATTERN.fullmatch(value):
		shown = value if len(value) <= 80 else value[:80] + "..."
		raise TelemetryValidationError(
			f"Invalid {field} {shown!r}: use 1-128 letters, digits, '.', '_' or '-', starting with a letter or digit"
		)
	return value


# The study fields MORPH fills in for every session, technical stubs included:
# they record when a session ran, not which task run it belongs to.
_LIFECYCLE_FIELDS = ("startedAt", "endedAt", "runStatus")


def _is_empty(value) -> bool:
	if isinstance(value, str):
		return not value.strip()
	if isinstance(value, (list, dict)):
		return not value
	return value is None


def is_technical_stub(session: dict) -> bool:
	"""True for a session MORPH opened and closed without a study task.

	Such a session has no study block, or one whose fields are all empty apart
	from startedAt, endedAt and runStatus. Any other non-empty study value (a
	participantId, a taskId, a prompt, a condition, or a field this code does
	not know) makes the session formal, and task_run_ids checks it in full.
	"""
	study = session.get("study")
	if study is None:
		return True
	if not isinstance(study, dict):
		return False
	return all(_is_empty(value) for key, value in study.items() if key not in _LIFECYCLE_FIELDS)


def task_run_ids(participant_id: str, session: dict) -> tuple[str, str] | None:
	"""Return (taskId, sessionId) for one session in an upload from participant_id,
	or None for a technical stub, which is not filed at all.

	Never guesses: a formal session without study.taskId is not filed under an
	unknown task, one without study.participantId is not filed under the
	request's participant, and a study.participantId that disagrees with the
	request is an error, not something to overwrite.
	"""
	session_id = require_id(session.get("sessionId"), "sessionId")
	if is_technical_stub(session):
		return None
	study = session.get("study") if isinstance(session.get("study"), dict) else {}
	task_id = require_id(study.get("taskId"), "study.taskId")
	claimed = study.get("participantId")
	if isinstance(claimed, str):
		claimed = claimed.strip()
	if claimed in (None, ""):
		raise TelemetryValidationError("Missing study.participantId")
	if claimed != participant_id:
		raise TelemetryValidationError(
			f"study.participantId {claimed!r} does not match the request participantId {participant_id!r}"
		)
	return task_id, session_id


def missing_settings() -> list[str]:
	"""Describe unset Firebase settings. Reads no credential and calls no API."""
	missing = []
	if not os.environ.get("FIREBASE_STORAGE_BUCKET", "").strip():
		missing.append("FIREBASE_STORAGE_BUCKET is not set")
	credentials_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
	if not credentials_file:
		missing.append("GOOGLE_APPLICATION_CREDENTIALS is not set")
	elif not os.path.isfile(credentials_file):
		missing.append("GOOGLE_APPLICATION_CREDENTIALS does not point to a file")
	return missing


_init_lock = threading.Lock()
_clients = None  # (Firestore client, Storage bucket) after the first successful connect()


def connect():
	"""Initialize Firebase Admin once; return (Firestore client, Storage bucket).

	Raises FirebaseUnavailableError when the bucket or the credentials are
	missing. The message names the setting, never a credential value.
	"""
	global _clients
	with _init_lock:
		if _clients is None:
			bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "").strip()
			if not bucket_name:
				raise FirebaseUnavailableError(
					"Telemetry storage is not configured on the server (FIREBASE_STORAGE_BUCKET is not set)"
				)
			try:
				try:
					app = firebase_admin.get_app()
				except ValueError:
					# No credential argument: the Admin SDK uses Application Default Credentials.
					app = firebase_admin.initialize_app(options={"storageBucket": bucket_name})
				_clients = (firestore.client(app), storage.bucket(bucket_name, app=app))
			except Exception as e:
				print(f"[telemetry] Firebase initialization failed: {e!r}")
				raise FirebaseUnavailableError(
					"Telemetry storage is not configured on the server "
					"(Firebase credentials could not be loaded; check GOOGLE_APPLICATION_CREDENTIALS)"
				) from e
		return _clients


def task_run_metadata(participant_id: str, task_id: str, session_id: str, session: dict, *, uploaded_at, received_at: int) -> dict:
	"""Firestore index fields for one session. The events stay in Cloud Storage only."""
	study = session.get("study") if isinstance(session.get("study"), dict) else {}
	events = session.get("events")
	event_count = len(events) if isinstance(events, list) else None
	raw_path = storage_path(participant_id, task_id, session_id)
	# Absent study fields are written as null, so merging into an existing
	# document never leaves behind values from an earlier session.
	return {
		"participantId": participant_id,
		"taskId": task_id,
		"sessionId": session_id,
		"participantGroup": study.get("participantGroup"),
		"assistiveTech": study.get("assistiveTech"),
		"taskPrompt": study.get("taskPrompt"),
		"targetUrl": study.get("targetUrl"),
		"oversightCondition": study.get("oversightCondition"),
		"startedAt": study.get("startedAt"),
		"endedAt": study.get("endedAt"),
		"runStatus": study.get("runStatus"),
		"eventCount": event_count,
		"uploadedAt": uploaded_at,
		"serverReceivedAt": received_at,
		"storagePath": raw_path,
		# The fields above describe the latest upload for this task. A restarted
		# task has several sessions: each keeps an entry here, and merge=True
		# leaves the other entries in place.
		"sessions": {
			session_id: {
				"startedAt": study.get("startedAt"),
				"endedAt": study.get("endedAt"),
				"runStatus": study.get("runStatus"),
				"eventCount": event_count,
				"serverReceivedAt": received_at,
				"storagePath": raw_path,
			},
		},
	}


def save_task_run(participant_id: str, task_id: str, session_id: str, session: dict, *, uploaded_at, received_at: int) -> dict:
	"""Upload the raw session to Cloud Storage, then upsert its Firestore index.

	Storage goes first, so the index never points at a missing object. After a
	partial failure, a retry rewrites the same object and merges into the same
	document.
	"""
	db, bucket = connect()
	raw_path = storage_path(participant_id, task_id, session_id)
	doc_path = firestore_path(participant_id, task_id)
	try:
		# Every key and value of the session, in order. json.dumps escapes
		# non-ASCII by default, so the bytes are valid UTF-8 even when truncated
		# page text holds a lone surrogate, and every string still round-trips.
		body = json.dumps(session, separators=(",", ":")).encode("utf-8")
		bucket.blob(raw_path).upload_from_string(body, content_type="application/json")
	except Exception as e:
		raise FirebaseWriteError(
			f"Cloud Storage upload failed ({type(e).__name__}); nothing was indexed, and retrying the upload is safe"
		) from e
	try:
		metadata = task_run_metadata(participant_id, task_id, session_id, session, uploaded_at=uploaded_at, received_at=received_at)
		db.document(doc_path).set(metadata, merge=True)
	except Exception as e:
		raise FirebaseWriteError(
			f"Saved to Cloud Storage, but the Firestore index update failed ({type(e).__name__}); retrying the upload is safe"
		) from e
	return {"storagePath": raw_path, "firestorePath": doc_path}
