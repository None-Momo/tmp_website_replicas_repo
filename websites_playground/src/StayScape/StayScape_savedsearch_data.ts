import { format, isValid, parseISO } from 'date-fns';

// Saved accommodation searches for StayScape.
//
// Persistence is the browser's localStorage, the same mechanism the playground
// already uses for generated pages (src/amazon/dynamic_page.ts). The app has no
// server-side user data, so each browser profile (and each origin, e.g. the
// dev server on :3000 vs. the built site on :3001) keeps its own copy.
//
// The predefined record below is the study's initial state. It is written only
// when nothing is stored yet, so navigation, refreshes and remounts never undo
// a participant's edits. Researchers restore it between sessions with
// resetSavedSearches() (see the /stayscape_study_reset page and README.md).

export interface StayScapeSavedSearch {
	/** Stable identifier used in URLs; never derived from the editable name. */
	id: string;
	name: string;
	destination: string;
	/** ISO calendar date, e.g. "2026-12-10". */
	checkIn: string;
	/** ISO calendar date, e.g. "2026-12-15". */
	checkOut: string;
	/** Whole currency units. */
	maxBudget: number;
	currency: 'USD';
}

export const SAVED_SEARCHES_STORAGE_KEY = 'stayscape.savedSearches';

export const INITIAL_SAVED_SEARCHES: readonly StayScapeSavedSearch[] = [
	{
		id: 'seattle-winter-trip',
		name: 'Seattle Winter Trip',
		destination: 'Seattle',
		checkIn: '2026-12-10',
		checkOut: '2026-12-15',
		maxBudget: 220,
		currency: 'USD',
	},
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
	return typeof value === 'string' && ISO_DATE.test(value) && isValid(parseISO(value));
}

function isSavedSearch(value: unknown): value is StayScapeSavedSearch {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.id === 'string' && v.id !== '' &&
		typeof v.name === 'string' &&
		typeof v.destination === 'string' &&
		isIsoDate(v.checkIn) &&
		isIsoDate(v.checkOut) &&
		typeof v.maxBudget === 'number' && Number.isFinite(v.maxBudget) &&
		v.currency === 'USD'
	);
}

function cloneInitial(): StayScapeSavedSearch[] {
	return INITIAL_SAVED_SEARCHES.map((s) => ({ ...s }));
}

/** The stored list, or null when nothing usable is stored (absent, unreadable or malformed). */
function readStoredList(): StayScapeSavedSearch[] | null {
	let raw: string | null;
	try {
		raw = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
	} catch {
		return null;
	}
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(isSavedSearch) : null;
	} catch {
		return null;
	}
}

function writeStoredList(list: StayScapeSavedSearch[]): boolean {
	try {
		window.localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(list));
		return true;
	} catch {
		return false;
	}
}

/**
 * All saved searches. Seeds the initial record the first time nothing is
 * stored; an existing list, edited or not, is returned as is.
 */
export function loadSavedSearches(): StayScapeSavedSearch[] {
	const stored = readStoredList();
	if (stored) return stored;
	const seed = cloneInitial();
	writeStoredList(seed);
	return seed;
}

export function findSavedSearch(id: string | undefined): StayScapeSavedSearch | undefined {
	if (!id) return undefined;
	return loadSavedSearches().find((s) => s.id === id);
}

export type SavedSearchChanges = Omit<StayScapeSavedSearch, 'id' | 'currency'>;

export type SaveResult =
	| { ok: true; record: StayScapeSavedSearch }
	| { ok: false; reason: 'not-found' | 'storage-unavailable' };

/**
 * Replaces the fields of one existing record in place. The record keeps its
 * id and position, and nothing is ever appended, so saving cannot create a
 * duplicate. Other records are written back unchanged.
 */
export function updateSavedSearch(id: string, changes: SavedSearchChanges): SaveResult {
	const list = loadSavedSearches();
	const index = list.findIndex((s) => s.id === id);
	if (index === -1) return { ok: false, reason: 'not-found' };
	const record: StayScapeSavedSearch = { ...list[index], ...changes };
	const next = list.slice();
	next[index] = record;
	if (!writeStoredList(next)) return { ok: false, reason: 'storage-unavailable' };
	return { ok: true, record };
}

/**
 * Restores the initial saved searches, replacing whatever is stored under the
 * saved-searches key. Nothing else in localStorage is touched.
 */
export function resetSavedSearches(): boolean {
	return writeStoredList(cloneInitial());
}

// ---------------------------------------------------------------------------
// Display helpers

/** "2026-12-10" -> "December 10, 2026". Unparseable input is shown as is. */
export function formatSavedSearchDate(isoDate: string): string {
	const date = parseISO(isoDate);
	return isValid(date) ? format(date, 'MMMM d, yyyy') : isoDate;
}

/** 220 -> "$220". */
export function formatBudget(amount: number, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

// ---------------------------------------------------------------------------
// Edit form values and validation

export interface SavedSearchFormValues {
	name: string;
	destination: string;
	checkIn: string;
	checkOut: string;
	/** Raw input text; validated into a whole number of currency units. */
	maxBudget: string;
}

export type SavedSearchFormErrors = Partial<Record<keyof SavedSearchFormValues, string>>;

export function toFormValues(search: StayScapeSavedSearch): SavedSearchFormValues {
	return {
		name: search.name,
		destination: search.destination,
		checkIn: search.checkIn,
		checkOut: search.checkOut,
		maxBudget: String(search.maxBudget),
	};
}

/**
 * Validates the edit form. Returns the changes to persist when every field is
 * valid, otherwise one message per invalid field. Every field is validated the
 * same way; no field is privileged or locked.
 */
export function validateSavedSearchForm(
	values: SavedSearchFormValues
): { errors: SavedSearchFormErrors; changes?: SavedSearchChanges } {
	const errors: SavedSearchFormErrors = {};
	const name = values.name.trim();
	const destination = values.destination.trim();
	const checkIn = values.checkIn.trim();
	const checkOut = values.checkOut.trim();
	const budgetText = values.maxBudget.trim();

	if (!name) errors.name = 'Enter a search name.';
	if (!destination) errors.destination = 'Enter a destination.';
	if (!isIsoDate(checkIn)) errors.checkIn = 'Enter a check-in date.';
	if (!isIsoDate(checkOut)) {
		errors.checkOut = 'Enter a check-out date.';
	} else if (isIsoDate(checkIn) && checkOut <= checkIn) {
		errors.checkOut = 'The check-out date must be after the check-in date.';
	}

	let maxBudget = 0;
	if (!budgetText) {
		errors.maxBudget = 'Enter a maximum budget.';
	} else if (!/^\d+$/.test(budgetText)) {
		errors.maxBudget = 'The maximum budget must be a whole number of dollars, with no decimals.';
	} else {
		maxBudget = Number(budgetText);
		if (maxBudget < 1) errors.maxBudget = 'The maximum budget must be at least $1.';
	}

	if (Object.keys(errors).length > 0) return { errors };
	return { errors, changes: { name, destination, checkIn, checkOut, maxBudget } };
}
