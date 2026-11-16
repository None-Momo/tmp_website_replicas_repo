import { resetSavedSearches } from './StayScape_savedsearch_data';

// Per-run initialization for MORPH study tasks.
//
// MORPH starts a new Task 1 run by opening
//   /stayscape?study_init=stayscape_saved_01&study_run_id=<unique id>
// The first time a run id is seen for a task, that task's data is restored to
// its initial state and the id is recorded. Any later visit with the same id
// (a refresh of the start URL, Back, a revisit) changes nothing, and visits
// without both parameters never reset anything. Only the task's own storage
// key is reset; the itinerary (Task 2) is never touched.

export const STUDY_INIT_STORAGE_KEY = 'stayscape.studyInit';

/** Tasks that can be initialized, with the reset each one performs. */
const STUDY_TASKS: Record<string, () => boolean> = {
	stayscape_saved_01: resetSavedSearches,
};

/** How many run ids are remembered per task (oldest are forgotten first). */
export const MAX_REMEMBERED_RUNS = 500;

export interface StudyInitRecord {
	/** Run ids already initialized, oldest first. */
	runIds: string[];
	lastRunId: string;
	/** ISO timestamp of the last initialization. */
	lastInitializedAt: string;
}

export type StudyInitResult =
	| { status: 'not-requested' }
	| { status: 'unknown-task'; taskId: string }
	| { status: 'already-initialized'; taskId: string; runId: string }
	| { status: 'initialized'; taskId: string; runId: string }
	| { status: 'failed'; taskId: string; runId: string };

type Registry = Record<string, StudyInitRecord>;

function readRegistry(): Registry {
	try {
		const raw = window.localStorage.getItem(STUDY_INIT_STORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : {};
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
		const out: Registry = {};
		for (const [task, rec] of Object.entries(parsed as Record<string, unknown>)) {
			const r = rec as Partial<StudyInitRecord> | null;
			if (r && Array.isArray(r.runIds) && r.runIds.every((x) => typeof x === 'string')) {
				out[task] = { runIds: r.runIds, lastRunId: String(r.lastRunId ?? ''), lastInitializedAt: String(r.lastInitializedAt ?? '') };
			}
		}
		return out;
	} catch {
		return {};
	}
}

export function getStudyInitRecord(taskId: string): StudyInitRecord | undefined {
	return readRegistry()[taskId];
}

/**
 * Applies a study initialization request from a URL query string. Runs
 * synchronously, so callers can invoke it before their first render.
 */
export function applyStudyInit(search: string, now: Date = new Date()): StudyInitResult {
	const params = new URLSearchParams(search);
	const taskId = (params.get('study_init') || '').trim();
	const runId = (params.get('study_run_id') || '').trim();
	if (!taskId || !runId) return { status: 'not-requested' };
	const reset = STUDY_TASKS[taskId];
	if (!reset) return { status: 'unknown-task', taskId };

	const registry = readRegistry();
	const record = registry[taskId];
	if (record?.runIds.includes(runId)) return { status: 'already-initialized', taskId, runId };

	// Reset first; record the run only if the reset was written, so a failed
	// reset is retried on the next visit with the same id.
	if (!reset()) return { status: 'failed', taskId, runId };
	const runIds = [...(record?.runIds ?? []), runId].slice(-MAX_REMEMBERED_RUNS);
	registry[taskId] = { runIds, lastRunId: runId, lastInitializedAt: now.toISOString() };
	try {
		window.localStorage.setItem(STUDY_INIT_STORAGE_KEY, JSON.stringify(registry));
	} catch {
		return { status: 'failed', taskId, runId };
	}
	return { status: 'initialized', taskId, runId };
}
