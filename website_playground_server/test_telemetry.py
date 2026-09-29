"""
Tests for MORPH telemetry storage: firebase_store.py and POST /telemetry/sessions.

Firebase is replaced by in-memory fakes, so no credentials or network access
are needed. From website_playground_server/:

	python -m unittest -v
"""

import copy
import io
import json
import os
import tempfile
import unittest
from unittest import mock

import firebase_admin
from fastapi.testclient import TestClient

import firebase_store
import main


RAW_PATH = "raw_sessions/P03/grumble_01/oversight_abc.json"
DOC_PATH = "participants/P03/taskRuns/grumble_01"


class FakeBucket:
	"""Stands in for storage.Bucket; uploads land in self.objects."""

	def __init__(self):
		self.objects = {}  # object name -> (bytes, content type)
		self.error = None  # raised by uploads when set

	def blob(self, name):
		return FakeBlob(self, name)


class FakeBlob:
	def __init__(self, bucket, name):
		self.bucket = bucket
		self.name = name

	def upload_from_string(self, data, content_type=None):
		if self.bucket.error:
			raise self.bucket.error
		self.bucket.objects[self.name] = (data, content_type)


class FakeFirestore:
	"""Stands in for firestore.Client; documents land in self.docs by path."""

	def __init__(self):
		self.docs = {}
		self.error = None  # raised by writes when set

	def document(self, path):
		return FakeDocument(self, path)


class FakeDocument:
	def __init__(self, db, path):
		self.db = db
		self.path = path

	def set(self, data, merge=False):
		if self.db.error:
			raise self.db.error
		doc = self.db.docs.get(self.path, {}) if merge else {}
		_merge(doc, copy.deepcopy(data))
		self.db.docs[self.path] = doc


def _merge(target, updates):
	# Firestore merge=True: nested maps merge key by key; other values replace.
	for key, value in updates.items():
		if isinstance(value, dict) and isinstance(target.get(key), dict):
			_merge(target[key], value)
		else:
			target[key] = value


def make_session(session_id="oversight_abc", task_id="grumble_01", study_participant="P03"):
	"""A session shaped like a MORPH export, with large page-snapshot values."""
	return {
		"sessionId": session_id,
		"exportedAt": 1790000005000,
		"events": [
			{
				"sessionId": session_id,
				"timestamp": 1790000000100,
				"eventType": "tool_result",
				"source": "agent",
				"payload": {
					"dom": "<main>" + "<div>result</div>" * 20000 + "</main>",
					"accessibilityTree": [{"role": "button", "name": "Search", "children": []}] * 500,
				},
			},
			{"sessionId": session_id, "timestamp": 1790000000200, "eventType": "human_intervention", "source": "user", "payload": {"text": "stop"}},
		],
		"groupedByStepId": {"step_1": [0, 1]},
		"oversightRhythmMetrics": {"interventionCount": 1},
		"oversightEscalationMetrics": {"escalations": []},
		"modelUsage": {"inputTokens": 1200, "outputTokens": 300},
		"study": {
			"participantId": study_participant,
			"participantGroup": "BLV",
			"assistiveTech": "JAWS",
			"taskId": task_id,
			"taskPrompt": "Find a quiet coffee shop",
			"targetUrl": "https://morph-fake-websites.onrender.com/grumble",
			"oversightCondition": "high",
			"startedAt": 1790000000000,
			"endedAt": 1790000004000,
			"runStatus": "completed",
		},
	}


def make_stub(session_id="oversight_stub"):
	"""A technical stub as MORPH exports it: one event, and only lifecycle study fields set."""
	return {
		"sessionId": session_id,
		"exportedAt": 1790000005000,
		"events": [{"sessionId": session_id, "timestamp": 1790000000100, "eventType": "session_started", "source": "system", "payload": {}}],
		"groupedByStepId": {},
		"oversightRhythmMetrics": {},
		"oversightEscalationMetrics": {},
		"study": {
			"participantId": "",
			"participantGroup": "",
			"assistiveTech": "",
			"taskId": "",
			"taskPrompt": "",
			"targetUrl": "",
			"oversightCondition": "",
			"startedAt": 1790000000000,
			"endedAt": 1790000000000,
			"runStatus": "cancelled",
		},
	}


class TelemetryTestCase(unittest.TestCase):
	"""The real endpoint, with fake Firebase clients and a temporary debug-copy directory."""

	def setUp(self):
		self.db = FakeFirestore()
		self.bucket = FakeBucket()
		self.data_dir = tempfile.TemporaryDirectory()
		self.addCleanup(self.data_dir.cleanup)
		self.log = io.StringIO()
		for patcher in (
			mock.patch.object(firebase_store, "connect", return_value=(self.db, self.bucket)),
			mock.patch.object(main, "TELEMETRY_DATA_DIR", self.data_dir.name),
			mock.patch("sys.stdout", self.log),
		):
			patcher.start()
			self.addCleanup(patcher.stop)
		self.client = TestClient(main.app)

	def upload(self, *sessions, participant_id="P03"):
		body = {"participantId": participant_id, "uploadedAt": 1790000010000, "sessions": list(sessions)}
		return self.client.post("/telemetry/sessions", json=body)

	def debug_copy_exists(self, participant_id, session_id):
		return os.path.isfile(os.path.join(self.data_dir.name, participant_id, f"{session_id}.json"))

	def assertNothingInFirebase(self):
		self.assertEqual(self.bucket.objects, {})
		self.assertEqual(self.db.docs, {})


class PathTests(unittest.TestCase):
	def test_storage_path(self):
		self.assertEqual(firebase_store.storage_path("P03", "grumble_01", "oversight_abc"), RAW_PATH)

	def test_firestore_path(self):
		self.assertEqual(firebase_store.firestore_path("P03", "grumble_01"), DOC_PATH)

	def test_ids_that_would_change_the_path_are_rejected(self):
		for bad in ("P03/../P04", "P03/x", "..", ".hidden", "__reserved__", "P 03", "a" * 129):
			with self.subTest(bad=bad), self.assertRaises(firebase_store.TelemetryValidationError):
				firebase_store.require_id(bad, "participantId")


class UploadTests(TelemetryTestCase):
	def test_stores_complete_raw_session_and_index(self):
		session = make_session()
		response = self.upload(session)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json(), {
			"ok": True,
			"storedCount": 1,
			"stored": [{"sessionId": "oversight_abc", "taskId": "grumble_01", "storagePath": RAW_PATH, "firestorePath": DOC_PATH}],
		})
		data, content_type = self.bucket.objects[RAW_PATH]
		self.assertEqual(content_type, "application/json")
		self.assertEqual(json.loads(data.decode("utf-8")), session)  # nothing removed, truncated or reshaped

		doc = dict(self.db.docs[DOC_PATH])
		received_at = doc.pop("serverReceivedAt")
		self.assertIsInstance(received_at, int)
		self.assertEqual(doc, {
			"participantId": "P03",
			"taskId": "grumble_01",
			"sessionId": "oversight_abc",
			"participantGroup": "BLV",
			"assistiveTech": "JAWS",
			"taskPrompt": "Find a quiet coffee shop",
			"targetUrl": "https://morph-fake-websites.onrender.com/grumble",
			"oversightCondition": "high",
			"startedAt": 1790000000000,
			"endedAt": 1790000004000,
			"runStatus": "completed",
			"eventCount": 2,
			"uploadedAt": 1790000010000,
			"storagePath": RAW_PATH,
			"sessions": {
				"oversight_abc": {
					"startedAt": 1790000000000,
					"endedAt": 1790000004000,
					"runStatus": "completed",
					"eventCount": 2,
					"serverReceivedAt": received_at,
					"storagePath": RAW_PATH,
				},
			},
		})
		self.assertTrue(self.debug_copy_exists("P03", "oversight_abc"))

	def test_missing_participant_id_is_rejected(self):
		response = self.client.post("/telemetry/sessions", json={"uploadedAt": 1, "sessions": [make_session()]})

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json(), {"ok": False, "storedCount": 0, "error": "Missing participantId."})
		self.assertNothingInFirebase()

	def test_missing_task_id_is_rejected(self):
		without_key = make_session()
		del without_key["study"]["taskId"]
		for session in (without_key, make_session(task_id=""), make_session(task_id=None)):
			with self.subTest(taskId=session["study"].get("taskId", "<absent>")):
				response = self.upload(session)

				self.assertEqual(response.status_code, 400)
				body = response.json()
				self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
				self.assertEqual(body["error"], "Stored 0 of 1 session in Firebase. sessions[0] oversight_abc: Missing study.taskId.")
				self.assertNothingInFirebase()
				self.assertIn("Missing study.taskId", self.log.getvalue())  # logged server-side too
				self.assertTrue(self.debug_copy_exists("P03", "oversight_abc"))  # debug copy kept, as before

	def test_missing_session_id_is_rejected(self):
		session = make_session()
		del session["sessionId"]
		response = self.upload(session)

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
		self.assertEqual(body["errors"], [{"index": 0, "sessionId": None, "error": "Missing sessionId"}])
		self.assertNothingInFirebase()

	def test_participant_mismatch_is_rejected(self):
		response = self.upload(make_session(study_participant="P04"))

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
		self.assertIn("study.participantId 'P04' does not match the request participantId 'P03'", body["error"])
		self.assertNothingInFirebase()

	def test_reupload_is_idempotent(self):
		session = make_session()
		first = self.upload(session)
		second = self.upload(session)

		self.assertEqual((first.status_code, second.status_code), (200, 200))
		self.assertEqual(second.json()["storedCount"], 1)
		self.assertEqual(list(self.bucket.objects), [RAW_PATH])
		self.assertEqual(json.loads(self.bucket.objects[RAW_PATH][0]), session)
		self.assertEqual(list(self.db.docs), [DOC_PATH])
		self.assertEqual(list(self.db.docs[DOC_PATH]["sessions"]), ["oversight_abc"])

	def test_restarted_task_keeps_every_session_in_the_index(self):
		cancelled = make_session("oversight_first")
		cancelled["study"]["runStatus"] = "cancelled"
		retry = make_session("oversight_second")
		del retry["study"]["endedAt"]
		response = self.upload(cancelled, retry)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()["storedCount"], 2)
		self.assertEqual(len(self.bucket.objects), 2)
		doc = self.db.docs[DOC_PATH]
		self.assertEqual((doc["sessionId"], doc["runStatus"]), ("oversight_second", "completed"))
		self.assertIsNone(doc["endedAt"])  # not left over from the first session
		self.assertEqual(set(doc["sessions"]), {"oversight_first", "oversight_second"})
		self.assertEqual(doc["sessions"]["oversight_first"]["runStatus"], "cancelled")

	def test_batch_stores_valid_sessions_and_reports_the_rest(self):
		no_task = make_session("oversight_no_task", task_id="")
		response = self.upload(make_session(), make_stub(), no_task)

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 1))
		self.assertEqual(
			body["error"],
			"Stored 1 of 2 sessions in Firebase and skipped 1 technical stub. sessions[2] oversight_no_task: Missing study.taskId.",
		)
		self.assertEqual(body["errors"], [{"index": 2, "sessionId": "oversight_no_task", "error": "Missing study.taskId"}])
		self.assertEqual([entry["index"] for entry in body["skipped"]], [1])
		self.assertEqual(list(self.bucket.objects), [RAW_PATH])

	def test_empty_study_stub_is_skipped(self):
		no_block = make_stub()
		del no_block["study"]
		null_block = make_stub()
		null_block["study"] = None
		blank_values = make_stub()
		blank_values["study"] = {"participantId": "  ", "taskId": None, "assistiveTech": [], "runStatus": "unknown"}
		for label, stub in (("MORPH stub", make_stub()), ("no study block", no_block), ("null study", null_block), ("blank values", blank_values)):
			with self.subTest(label):
				response = self.upload(stub)

				self.assertEqual(response.status_code, 200)
				self.assertEqual(response.json(), {
					"ok": True,
					"storedCount": 0,
					"stored": [],
					"skipped": [{"index": 0, "sessionId": "oversight_stub", "reason": "Technical stub: empty study metadata", "eventCount": 1}],
				})
				self.assertNothingInFirebase()
				self.assertIn("skipped technical stub session oversight_stub", self.log.getvalue())
				self.assertTrue(self.debug_copy_exists("P03", "oversight_stub"))  # debug copy kept, as before

	def test_formal_sessions_with_stubs_return_ok_and_count_only_formal_sessions(self):
		response = self.upload(
			make_stub("oversight_stub_1"),
			make_session(),
			make_stub("oversight_stub_2"),
			make_session("oversight_def", task_id="flight_01"),
		)

		self.assertEqual(response.status_code, 200)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (True, 2))
		self.assertNotIn("errors", body)
		self.assertEqual([entry["sessionId"] for entry in body["stored"]], ["oversight_abc", "oversight_def"])
		self.assertEqual([(entry["index"], entry["sessionId"]) for entry in body["skipped"]], [(0, "oversight_stub_1"), (2, "oversight_stub_2")])
		self.assertEqual(sorted(self.bucket.objects), ["raw_sessions/P03/flight_01/oversight_def.json", RAW_PATH])
		self.assertEqual(sorted(self.db.docs), ["participants/P03/taskRuns/flight_01", DOC_PATH])

	def test_participant_without_task_still_fails(self):
		stub_with_participant = make_stub()
		stub_with_participant["study"]["participantId"] = "P03"
		for label, session in (("stub with participantId", stub_with_participant), ("formal session", make_session(task_id=""))):
			with self.subTest(label):
				response = self.upload(session)

				self.assertEqual(response.status_code, 400)
				body = response.json()
				self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
				self.assertEqual(body["errors"][0]["error"], "Missing study.taskId")
				self.assertNotIn("skipped", body)
				self.assertNothingInFirebase()

	def test_task_without_participant_still_fails(self):
		stub_with_task = make_stub()
		stub_with_task["study"]["taskId"] = "grumble_01"
		no_participant_key = make_session()
		del no_participant_key["study"]["participantId"]
		cases = (
			("stub with taskId", stub_with_task),
			("empty study.participantId", make_session(study_participant="")),
			("no study.participantId", no_participant_key),
		)
		for label, session in cases:
			with self.subTest(label):
				response = self.upload(session)

				self.assertEqual(response.status_code, 400)
				body = response.json()
				self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
				self.assertEqual(body["errors"][0]["error"], "Missing study.participantId")
				self.assertNotIn("skipped", body)
				self.assertNothingInFirebase()

	def test_any_other_study_value_makes_a_session_formal(self):
		for field in ("participantGroup", "assistiveTech", "taskPrompt", "targetUrl", "oversightCondition", "fieldAddedLater"):
			with self.subTest(field=field):
				stub = make_stub()
				stub["study"][field] = "set"
				response = self.upload(stub)

				self.assertEqual(response.status_code, 400)
				self.assertEqual(response.json()["errors"][0]["error"], "Missing study.taskId")
				self.assertNothingInFirebase()

	def test_malformed_study_block_is_not_a_stub(self):
		for study in ("grumble_01", ["P03", "grumble_01"], 0):
			with self.subTest(study=study):
				stub = make_stub()
				stub["study"] = study
				response = self.upload(stub)

				self.assertEqual(response.status_code, 400)
				self.assertEqual(response.json()["errors"][0]["error"], "Missing study.taskId")
				self.assertNothingInFirebase()

	def test_stub_without_session_id_still_fails(self):
		stub = make_stub()
		del stub["sessionId"]
		response = self.upload(stub)

		self.assertEqual(response.status_code, 400)
		self.assertEqual(response.json()["errors"], [{"index": 0, "sessionId": None, "error": "Missing sessionId"}])

	def test_firebase_failure_still_fails_with_stubs_in_the_batch(self):
		self.bucket.error = RuntimeError("storage down")
		response = self.upload(make_session(), make_stub())

		self.assertEqual(response.status_code, 502)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
		self.assertTrue(body["error"].startswith(
			"Stored 0 of 1 session in Firebase and skipped 1 technical stub. sessions[0] oversight_abc: Cloud Storage upload failed (RuntimeError)"
		))
		self.assertEqual([entry["index"] for entry in body["skipped"]], [1])

	def test_storage_failure_is_not_reported_as_success(self):
		self.bucket.error = RuntimeError("bucket said no to svc@example.iam.gserviceaccount.com")
		response = self.upload(make_session())

		self.assertEqual(response.status_code, 502)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
		self.assertIn("Cloud Storage upload failed (RuntimeError)", body["error"])
		self.assertNotIn("svc@example", response.text)  # the cause is logged, not returned
		self.assertIn("svc@example", self.log.getvalue())
		self.assertEqual(self.db.docs, {})  # nothing indexed without the raw object
		self.assertTrue(self.debug_copy_exists("P03", "oversight_abc"))

	def test_retry_after_firestore_failure_completes_the_upload(self):
		self.db.error = RuntimeError("firestore unavailable")
		failed = self.upload(make_session())

		self.assertEqual(failed.status_code, 502)
		self.assertIn("Firestore index update failed (RuntimeError)", failed.json()["error"])
		self.assertEqual(list(self.bucket.objects), [RAW_PATH])

		self.db.error = None
		retried = self.upload(make_session())
		self.assertEqual(retried.status_code, 200)
		self.assertEqual(list(self.bucket.objects), [RAW_PATH])
		self.assertEqual(list(self.db.docs), [DOC_PATH])

	def test_raw_json_round_trips_unicode_and_lone_surrogates(self):
		session = make_session()
		# The last character is half an emoji, as truncated page text can leave.
		session["events"][1]["payload"]["text"] = "Café ☕ 🦮 盲人 \ud83d"
		body = json.dumps({"participantId": "P03", "uploadedAt": 1, "sessions": [session]})
		response = self.client.post("/telemetry/sessions", content=body, headers={"Content-Type": "application/json"})

		self.assertEqual(response.status_code, 200)
		self.assertEqual(json.loads(self.bucket.objects[RAW_PATH][0].decode("utf-8")), session)

	def test_malformed_body_is_rejected(self):
		for content in (b"{not json", b"[1, 2]", b'{"participantId": "P03", "sessions": []}'):
			with self.subTest(content=content):
				response = self.client.post("/telemetry/sessions", content=content, headers={"Content-Type": "application/json"})

				self.assertEqual(response.status_code, 400)
				self.assertEqual((response.json()["ok"], response.json()["storedCount"]), (False, 0))
		self.assertNothingInFirebase()

	def test_extension_cors_still_works_on_success_and_failure(self):
		origin = {"Origin": "chrome-extension://abcdefghijklmnop"}
		preflight = self.client.options(
			"/telemetry/sessions",
			headers={**origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
		)
		self.assertEqual(preflight.status_code, 200)
		self.assertIn("access-control-allow-origin", preflight.headers)
		for session in (make_session(), make_session(task_id="")):
			response = self.client.post("/telemetry/sessions", headers=origin, json={"participantId": "P03", "sessions": [session]})
			self.assertIn("access-control-allow-origin", response.headers)


class FirebaseConfigTests(unittest.TestCase):
	"""The real connect() and health check, driven by environment variables."""

	def setUp(self):
		self.data_dir = tempfile.TemporaryDirectory()
		self.addCleanup(self.data_dir.cleanup)
		self.log = io.StringIO()
		for patcher in (
			mock.patch.object(firebase_store, "_clients", None),
			mock.patch.object(main, "TELEMETRY_DATA_DIR", self.data_dir.name),
			mock.patch("sys.stdout", self.log),
		):
			patcher.start()
			self.addCleanup(patcher.stop)
		self.addCleanup(self._delete_firebase_app)
		self.client = TestClient(main.app)

	@staticmethod
	def _delete_firebase_app():
		# connect() may have registered the default Firebase app; drop it between tests.
		try:
			firebase_admin.delete_app(firebase_admin.get_app())
		except ValueError:
			pass

	def upload(self):
		return self.client.post("/telemetry/sessions", json={"participantId": "P03", "sessions": [make_session()]})

	def test_missing_bucket_returns_503(self):
		with mock.patch.dict(os.environ, {"FIREBASE_STORAGE_BUCKET": ""}):
			response = self.upload()

		self.assertEqual(response.status_code, 503)
		body = response.json()
		self.assertEqual((body["ok"], body["storedCount"]), (False, 0))
		self.assertIn("FIREBASE_STORAGE_BUCKET is not set", body["error"])
		self.assertTrue(os.path.isfile(os.path.join(self.data_dir.name, "P03", "oversight_abc.json")))

	def test_unloadable_credentials_return_503_without_leaking_them(self):
		key_file = os.path.join(self.data_dir.name, "firebase-service-account.json")
		with open(key_file, "w") as f:
			json.dump({
				"type": "service_account",
				"project_id": "demo-project",
				"private_key_id": "0123456789abcdef",
				"private_key": "SECRET-KEY-MATERIAL-MARKER",  # unparseable, and no PEM armor to trip secret scanners
				"client_email": "svc@demo-project.iam.gserviceaccount.com",
				"token_uri": "https://oauth2.googleapis.com/token",
			}, f)
		env = {"FIREBASE_STORAGE_BUCKET": "demo-bucket", "GOOGLE_APPLICATION_CREDENTIALS": key_file}
		with mock.patch.dict(os.environ, env):
			response = self.upload()

		self.assertEqual(response.status_code, 503)
		self.assertIn("Firebase credentials could not be loaded", response.json()["error"])
		for secret in ("SECRET-KEY-MATERIAL-MARKER", "0123456789abcdef", "svc@demo-project"):
			self.assertNotIn(secret, response.text)
			self.assertNotIn(secret, self.log.getvalue())

	def test_health_reports_configuration_without_values(self):
		key_file = os.path.join(self.data_dir.name, "firebase-service-account.json")
		open(key_file, "w").close()
		env = {"FIREBASE_STORAGE_BUCKET": "demo-bucket", "GOOGLE_APPLICATION_CREDENTIALS": key_file}
		with mock.patch.dict(os.environ, env):
			configured = self.client.get("/telemetry/health")
		with mock.patch.dict(os.environ, {"FIREBASE_STORAGE_BUCKET": "", "GOOGLE_APPLICATION_CREDENTIALS": ""}):
			unconfigured = self.client.get("/telemetry/health")

		self.assertEqual(configured.status_code, 200)
		self.assertEqual((configured.json()["ok"], configured.json()["firebaseConfigured"]), (True, True))
		self.assertNotIn("demo-bucket", configured.text)
		self.assertNotIn("firebase-service-account", configured.text)
		self.assertEqual((unconfigured.json()["ok"], unconfigured.json()["firebaseConfigured"]), (True, False))


if __name__ == "__main__":
	unittest.main()
