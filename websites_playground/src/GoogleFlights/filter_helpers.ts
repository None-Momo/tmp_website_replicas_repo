import { Flight } from "./flightAsset";
import { Filters } from "./filterbar";

/** Minutes after midnight for a displayed time: "5:15 PM" -> 1035, "12:05 AM" -> 5,
 *  "17:15" -> 1035. The scraped times are 12-hour with AM/PM (often after a
 *  narrow no-break space); splitting on ":" alone read "5:15 PM" as 5:00. */
export const timeToMin = (t: string) => {
	const m = /(\d{1,2}):(\d{2})\s*([AaPp])?\.?\s*[Mm]?/.exec(t.replace(/[\u202f\u00a0]/g, " "));
	if (!m) return NaN;
	let h = Number(m[1]) % 24;
	const min = Number(m[2]);
	const meridiem = m[3]?.toUpperCase();
	if (meridiem === "A") h = h % 12;            // 12:xx AM is just after midnight
	else if (meridiem === "P") h = (h % 12) + 12; // 12:xx PM is just after noon
	return h * 60 + min;
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
/** startH and endH are whole hours; the end hour is inclusive through :59,
 *  so 0-23 covers the whole day (it used to drop departures after 11:00 PM). */
export const inDepartWindow = (tMin: number, startH: number, endH: number) => {
	if (Number.isNaN(tMin)) return true; // unknown time: do not hide the flight
	const a = startH * 60, b = endH * 60 + 59;
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