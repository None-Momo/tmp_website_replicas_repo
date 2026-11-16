import * as cheerio from 'cheerio';

import { AIRPORT_CITIES, Flight } from "./flightAsset";


/** Clean thin NBSPs, double spaces, and trim */
function clean(s: string): string {
	return s.replace(/\u202F|\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function extractIataFromLogoStyle(styleAttr: string | undefined): string {
	if (!styleAttr) return "";
	const m = styleAttr.match(/\/([A-Z0-9]{2})\.png\)/);
	return m ? m[1] : "";
}

function parseStops(stopsText: string): number {
	const t = stopsText.toLowerCase();
	if (t.includes("nonstop")) return 0;
	const m = t.match(/(\d+)\s+stop/);
	return m ? parseInt(m[1], 10) : 0;
}

function parsePriceFromAriaLabel(aria: string | undefined, fallbackText: string): number | null {
	const src = aria ?? fallbackText;
	const digits = src.replace(/[^0-9]/g, "");
	return digits ? parseInt(digits, 10) : null;
}

/** Pull selected cabin from the page-level filter (applies to all cards) */
function getSelectedCabin($: cheerio.CheerioAPI): string {
	const selectedTexts = $('li[role="option"][aria-selected="true"]')
		.toArray()
		.map((el) => clean($(el).text()));

	// Find the one that mentions a cabin
	const cabinRaw =
		selectedTexts.find((t) =>
			/(Economy|Premium economy|Business|First)/i.test(t)
		) ?? "Economy";

	// Normalize like "Economy (include Basic)" -> "Economy"
	return cabinRaw.replace(/\s*\(.*?\)\s*$/g, "");
}

// Pull out emission index if available (not in snippet)
function parseEmissionsIndex(emText: string): number | null {


	return null;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Calendar-day difference between the "on <Weekday>, <Month> <day>" dates in a
 *  card's "Leaves ... and arrives ..." label (both local times). */
function parseArrivalDayOffset(label: string | undefined): number {
	const dates: RegExpMatchArray[] = [];
	const re = /on\s+\w+,\s+([A-Za-z]+)\s+(\d{1,2})/g;
	for (let m = re.exec(label || ""); m; m = re.exec(label || "")) dates.push(m);
	if (dates.length < 2) return 0;
	const toDay = (m: RegExpMatchArray) => {
		const month = MONTHS.indexOf(m[1].toLowerCase());
		return month < 0 ? null : Date.UTC(2001, month, parseInt(m[2], 10));
	};
	const dep = toDay(dates[0]);
	let arr = toDay(dates[dates.length - 1]);
	if (dep === null || arr === null) return 0;
	if (arr < dep) arr = Date.UTC(2002, new Date(arr).getUTCMonth(), new Date(arr).getUTCDate()); // year rollover
	return Math.round((arr - dep) / 86400000);
}

/** Airport name from the card's label, for codes missing from AIRPORT_CITIES. */
function airportNameFromLabel(label: string | undefined, which: "leaves" | "arrives"): string {
	const re = which === "leaves" ? /Leaves (.+?) at / : /arrives at (.+?) at /;
	return (label || "").match(re)?.[1] ?? "";
}

const AIRLINE_CODES: Array<[string, string]> = [
	["American", "AA"], ["United", "UA"], ["Air Canada", "AC"], ["JAL", "JL"], ["Delta", "DL"], ["Alaska", "AS"],
];

/** Deterministic mock flight number; the scraped results have none. */
function mockFlightNumber(code: string, key: string, taken: Set<string>): string {
	let h = 0x811c9dc5;
	for (const c of key) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
	let n = 100 + (h % 2800);
	while (taken.has(`${code} ${n}`)) n += 1;
	taken.add(`${code} ${n}`);
	return `${code} ${n}`;
}

/** Main parse routine per flight card */
export function parseFlights(html: string): Flight[] {
	const $ = cheerio.load(html);
	const flights: Flight[] = [];

	const selectedCabin = getSelectedCabin($);

	// Each result card (structure observed in your file)
	const seen = new Set<string>();
	const takenNumbers = new Set<string>();

	$("li.pIav2d").each((i, el) => {
		const root = $(el);

		// Airline name (appears near times)
		const airline =
			clean(root.find(".Ir0Voe .sSHqwe.tPgKwe.ogfYpf").first().text()) ||
			clean(root.find(".sSHqwe.tPgKwe.ogfYpf").first().text());

		// IATA from logo URL in inline style
		const logoStyle =
			root.find(".EbY4Pc.P2UJoe").first().attr("style") ||
			root.find(".EbY4Pc.P2UJoe").eq(1).attr("style");
		const airlineLogo = extractIataFromLogoStyle(logoStyle);

		// Departure/arrival times
		const departureTime = clean(
			root.find('span[aria-label^="Departure time"]').first().text()
		);
		const arrivalTime = clean(
			root.find('span[aria-label^="Arrival time"]').first().text()
		);

		// Airports (ORD/LAX...) live in QylvBf spans with empty aria-label
		const airportSpans = root.find('.QylvBf span[aria-label=""]');
		const departure = clean(airportSpans.first().text()).toUpperCase();
		const arrival = clean(airportSpans.last().text()).toUpperCase();

		// Duration
		const duration = clean(root.find(".gvkrdb").first().text());

		// Stops (Nonstop or "1 stop", "2 stops")
		const stopsText = clean(root.find(".EfT7Ae .ogfYpf").first().text());
		const stops = parseStops(stopsText);

		// Price (prefer aria-label "150 US dollars", fallback to text)
		const priceNode = root.find('.YMlIz [aria-label*="dollar"]').first();
		const price = parsePriceFromAriaLabel(
			priceNode.attr("aria-label"),
			clean(priceNode.text())
		) || 0;

		// The full itinerary label carries both local dates; the visible
		// arrival time has a "+1"-style day marker glued on, which the
		// explicit arrival date now replaces.
		const leavesLabel = root.find('[aria-label^="Leaves "]').first().attr("aria-label");
		const arrivalDayOffset = parseArrivalDayOffset(leavesLabel);
		const arrivalTimeClean = arrivalTime.replace(/\s*\+\d+$/, "");

		// The scraped page lists some flights twice; keep the first copy.
		const identity = [airline, departure, arrival, departureTime, arrivalTimeClean, price, stops, arrivalDayOffset].join("|");
		if (seen.has(identity)) return;
		seen.add(identity);

		const code = airlineLogo || AIRLINE_CODES.find(([name]) => airline.startsWith(name))?.[1] || "XX";
		const flightNumber = mockFlightNumber(code, `${departure}|${arrival}|${departureTime}|${arrivalTimeClean}|${airline}`, takenNumbers);

		flights.push({
			id: String(flights.length + 1),
			airline,
			airlineLogo,
			departure,
			arrival,
			departureTime,
			arrivalTime: arrivalTimeClean,
			duration,
			stops,
			price,
			class: selectedCabin,
			emissionsIndex: 0,  // Placeholder; real data not in snippet
			flightNumber,
			departureCity: AIRPORT_CITIES[departure] || airportNameFromLabel(leavesLabel, "leaves"),
			arrivalCity: AIRPORT_CITIES[arrival] || airportNameFromLabel(leavesLabel, "arrives"),
			arrivalDayOffset,
		});
	});

	return flights;
}
