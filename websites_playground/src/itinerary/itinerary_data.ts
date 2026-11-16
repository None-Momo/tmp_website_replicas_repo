// Trip itinerary shared by the flight site and StayScape.
//
// All replica sites are routes of one single-page app served from one origin,
// so the browser's localStorage is shared between them and is the natural
// place for the itinerary (the same mechanism as StayScape saved searches).
// It is kept under its own key, separate from saved searches, so the two
// study tasks never read or reset each other's data.
//
// The initial state is an empty itinerary. Nothing is added automatically:
// entries are written only by the "Add to itinerary" buttons on the flight
// and stay details pages. See README.md, "Trip itinerary".

export const ITINERARY_STORAGE_KEY = 'trip.itinerary';

export interface ItineraryFlight {
	airline: string;
	flightNumber: string;
	departureAirport: string;
	departureCity: string;
	arrivalAirport: string;
	arrivalCity: string;
	/** ISO date, local to the departure airport. */
	departureDate: string;
	departureTime: string;
	/** ISO date, local to the arrival airport. */
	arrivalDate: string;
	arrivalTime: string;
	duration: string;
	stops: number;
	price: number;
}

export interface ItineraryStay {
	listingSlug: string;
	name: string;
	destination: string;
	area: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	guests: number;
	nightlyPrice: number;
	totalPrice: number;
	/** Display labels, e.g. "Wi-Fi". */
	amenities: string[];
}

export interface Itinerary {
	flight: ItineraryFlight | null;
	stay: ItineraryStay | null;
}

const EMPTY: Itinerary = { flight: null, stay: null };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const strings = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => typeof o[k] === 'string');
const numbers = (o: Record<string, unknown>, keys: string[]) => keys.every((k) => typeof o[k] === 'number' && Number.isFinite(o[k]));

function isFlight(v: unknown): v is ItineraryFlight {
	return isObject(v)
		&& strings(v, ['airline', 'flightNumber', 'departureAirport', 'departureCity', 'arrivalAirport', 'arrivalCity', 'departureDate', 'departureTime', 'arrivalDate', 'arrivalTime', 'duration'])
		&& numbers(v, ['stops', 'price']);
}

function isStay(v: unknown): v is ItineraryStay {
	return isObject(v)
		&& strings(v, ['listingSlug', 'name', 'destination', 'area', 'checkIn', 'checkOut'])
		&& numbers(v, ['nights', 'guests', 'nightlyPrice', 'totalPrice'])
		&& Array.isArray(v.amenities) && v.amenities.every((a) => typeof a === 'string');
}

/** The stored itinerary; a missing, unreadable or malformed part reads as empty. */
export function loadItinerary(): Itinerary {
	try {
		const raw = window.localStorage.getItem(ITINERARY_STORAGE_KEY);
		if (!raw) return { ...EMPTY };
		const parsed: unknown = JSON.parse(raw);
		if (!isObject(parsed)) return { ...EMPTY };
		return { flight: isFlight(parsed.flight) ? parsed.flight : null, stay: isStay(parsed.stay) ? parsed.stay : null };
	} catch {
		return { ...EMPTY };
	}
}

function write(itinerary: Itinerary): boolean {
	try {
		window.localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify(itinerary));
		return true;
	} catch {
		return false;
	}
}

export type SaveOutcome = { ok: true; replaced: boolean } | { ok: false };

/** Records the trip's flight, replacing any flight already recorded. */
export function setItineraryFlight(flight: ItineraryFlight): SaveOutcome {
	const current = loadItinerary();
	return write({ ...current, flight: { ...flight } }) ? { ok: true, replaced: current.flight !== null } : { ok: false };
}

/** Records the trip's stay, replacing any stay already recorded. */
export function setItineraryStay(stay: ItineraryStay): SaveOutcome {
	const current = loadItinerary();
	return write({ ...current, stay: { ...stay, amenities: [...stay.amenities] } }) ? { ok: true, replaced: current.stay !== null } : { ok: false };
}

export function removeItineraryFlight(): boolean {
	return write({ ...loadItinerary(), flight: null });
}

export function removeItineraryStay(): boolean {
	return write({ ...loadItinerary(), stay: null });
}

/** Restores the initial, empty itinerary. Only the itinerary key is touched. */
export function resetItinerary(): boolean {
	try {
		window.localStorage.removeItem(ITINERARY_STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}
