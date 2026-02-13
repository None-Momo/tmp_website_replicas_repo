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