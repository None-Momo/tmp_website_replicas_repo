import * as cheerio from 'cheerio';

import { Flight } from "./flightAsset";


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

/** Main parse routine per flight card */
export function parseFlights(html: string): Flight[] {
	const $ = cheerio.load(html);
	const flights: Flight[] = [];

	const selectedCabin = getSelectedCabin($);

	// Each result card (structure observed in your file)
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

		flights.push({
			id: String(i + 1),
			airline,
			airlineLogo,
			departure,
			arrival,
			departureTime,
			arrivalTime,
			duration,
			stops,
			price,
			class: selectedCabin,
			emissionsIndex: 0,  // Placeholder; real data not in snippet
		});
	});

	return flights;
}
