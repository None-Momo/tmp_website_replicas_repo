import { Flight } from "./flightAsset";
import { Filters } from "./filterbar";

const timeToMin = (t: string) => {
	const [h, m] = t.split(":").map(Number);
	return h * 60 + (m || 0);
};
const durToMin = (d: string) => {
	const h = /(\d+)\s*h/.exec(d)?.[1];
	const m = /(\d+)\s*m/.exec(d)?.[1];
	return (h ? +h * 60 : 0) + (m ? +m : 0);
};
const stopsMatch = (stops: number, wanted: ("nonstop" | "1stop" | "2plus")[]) => {
	if (!wanted.length) return true;
	if (stops === 0 && wanted.includes("nonstop")) return true;
	if (stops === 1 && wanted.includes("1stop")) return true;
	if (stops >= 2 && wanted.includes("2plus")) return true;
	return false;
};
const inDepartWindow = (tMin: number, startH: number, endH: number) => {
	const a = startH * 60, b = endH * 60;
	if (a <= b) return tMin >= a && tMin <= b;
	// wrap-around (e.g., 22:00–06:00)
	return tMin >= a || tMin <= b;
};

export function applyFilters(f: Flight, flt: Filters) {
	// stops
	if (!stopsMatch(f.stops, flt.stops)) return false;

	// airlines (match either full name or code)
	if (flt.airlines.length) {
		const nameOrCode = (s: string) =>
			flt.airlines.some(a =>
				a.toLowerCase() === s.toLowerCase() ||
				s.toLowerCase().includes(a.toLowerCase())
			);
		if (!(nameOrCode(f.airline) || nameOrCode(f.airlineLogo))) return false;
	}


	// price
	if (f.price > flt.priceMax) return false;

	// times
	if (!inDepartWindow(timeToMin(f.departureTime), flt.departStart, flt.departEnd))
		return false;

	// emissions (if available)
	if (flt.lowEmissionsOnly && f.emissionsIndex !== undefined && f.emissionsIndex > 1)
		return false;


	// duration
	if (durToMin(f.duration) > flt.durationMaxHrs * 60) return false;

	return true;
}