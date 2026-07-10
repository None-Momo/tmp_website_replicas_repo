export interface Flight {
	id: string;
	airline: string;
	airlineLogo: string;   // IATA code like "DL", "NK"
	departure: string;     // e.g., "JFK"
	arrival: string;       // e.g., "LAX"
	departureTime: string; // e.g., "08:00"
	arrivalTime: string;   // e.g., "11:30"
	duration: string;      // e.g., "5 hr 30 min"
	stops: number;         // 0 for nonstop, else number of stops
	price: number | 0;  // numeric price
	class: string;
	emissionsIndex: number | 0;      // "Economy", "Premium economy", "Business", "First"
}

/** Flight.id is only unique within the single file it was parsed from (both
 *  known result files number their flights 1, 2, 3, ...), so it can't be
 *  used alone as a stable URL identifier. This composite key is unique
 *  enough within a small demo dataset and is deterministic from the flight's
 *  own fields, so a detail page can recompute it while scanning candidate
 *  files for a match — no shared ID needed. */
export function flightSlug(f: Pick<Flight, 'airline' | 'departure' | 'arrival' | 'price'>): string {
	return `${f.airline}-${f.departure}-${f.arrival}-${f.price}`
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}