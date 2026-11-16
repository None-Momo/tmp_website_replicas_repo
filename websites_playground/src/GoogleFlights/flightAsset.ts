import { addDays, format, isValid, parseISO } from 'date-fns';

export interface Flight {
	id: string;
	airline: string;
	airlineLogo: string;   // IATA code like "DL", "NK"
	departure: string;     // e.g., "JFK"
	arrival: string;       // e.g., "LAX"
	departureTime: string; // e.g., "08:00"
	arrivalTime: string;   // e.g., "11:30" (local to the arrival airport)
	duration: string;      // e.g., "5 hr 30 min"
	stops: number;         // 0 for nonstop, else number of stops
	price: number | 0;  // numeric price
	class: string;
	emissionsIndex: number | 0;      // "Economy", "Premium economy", "Business", "First"
	/** Mock flight number, e.g. "UA 1432" (the scraped results carry none). */
	flightNumber: string;
	departureCity: string;
	arrivalCity: string;
	/**
	 * Calendar days between departure and arrival, each in its airport's
	 * local time, as given by the scraped itinerary (0 same day, 1 next day,
	 * and so on). It already reflects overnight flying and time zones.
	 */
	arrivalDayOffset: number;
}

/** City for each airport code in the flight data. */
export const AIRPORT_CITIES: Record<string, string> = {
	ORD: 'Chicago', MDW: 'Chicago', LAX: 'Los Angeles', JFK: 'New York', LGA: 'New York',
	EWR: 'Newark', SIN: 'Singapore',
};

/** Departure and arrival calendar dates for a flight leaving on `departureDate` (ISO). */
export function flightDates(flight: Pick<Flight, 'arrivalDayOffset'>, departureDate: string): { departureDate: string; arrivalDate: string } | null {
	const d = parseISO(departureDate);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || !isValid(d)) return null;
	return { departureDate, arrivalDate: format(addDays(d, flight.arrivalDayOffset), 'yyyy-MM-dd') };
}

/** "2026-12-10" -> "Thursday, December 10, 2026". */
export function formatFlightDate(iso: string): string {
	const d = parseISO(iso);
	return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : iso;
}

/** Details-page URL segment. The flight number makes it unique per flight. */
export function flightSlug(f: Pick<Flight, 'airline' | 'flightNumber' | 'departure' | 'arrival'>): string {
	return `${f.airline}-${f.flightNumber}-${f.departure}-${f.arrival}`
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

/** The earlier slug format (not unique: several flights shared one). Old links still resolve to the first match. */
export function legacyFlightSlug(f: Pick<Flight, 'airline' | 'departure' | 'arrival' | 'price'>): string {
	return `${f.airline}-${f.departure}-${f.arrival}-${f.price}`
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}
