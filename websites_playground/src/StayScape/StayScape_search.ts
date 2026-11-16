import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

// StayScape accommodation search: listing model, destination matching, date
// and price validation, and the URL query string that carries a search.
// Listing data lives in StayScape_listings_data.ts. Everything here is pure
// so it can be unit-tested and reused by the results and details pages.

export const AMENITIES = [
	{ key: 'wifi', label: 'Wi-Fi' },
	{ key: 'parking', label: 'Parking' },
	{ key: 'breakfast', label: 'Breakfast' },
	{ key: 'pool', label: 'Swimming pool' },
	{ key: 'air-conditioning', label: 'Air conditioning' },
] as const;

export type AmenityKey = typeof AMENITIES[number]['key'];

const AMENITY_KEYS: readonly string[] = AMENITIES.map((a) => a.key);

export function isAmenityKey(value: string): value is AmenityKey {
	return AMENITY_KEYS.includes(value);
}

export function amenityLabel(key: AmenityKey): string {
	return AMENITIES.find((a) => a.key === key)?.label ?? key;
}

export interface StayScapeListing {
	id: string;
	/** URL segment for /stayscape_details/:slug. */
	slug: string;
	/** Slug produced by the earlier HTML-card rendering; old links still resolve. */
	legacySlug: string | null;
	city: string;
	/** Neighbourhood or area shown after the property type, e.g. "Waikiki". */
	area: string;
	propertyType: string;
	name: string;
	highlight: string;
	/** Whole US dollars per night. */
	nightlyPrice: number;
	rating: number | null;
	reviewCount: number;
	photoUrl: string | null;
	amenities: AmenityKey[];
}

// ---------------------------------------------------------------------------
// Destinations

interface Destination {
	city: string;
	/** Names matched as whole words anywhere in the query. */
	names: string[];
	/** Short forms and airport codes, matched only when they are the whole query. */
	codes: string[];
}

export const DESTINATIONS: readonly Destination[] = [
	{ city: 'Honolulu', names: ['honolulu', 'waikiki', 'oahu'], codes: ['hnl'] },
	{ city: 'Los Angeles', names: ['los angeles', 'santa monica', 'hollywood'], codes: ['la', 'lax'] },
	{ city: 'New York', names: ['new york', 'new york city', 'manhattan', 'brooklyn'], codes: ['ny', 'nyc', 'jfk', 'lga'] },
	{ city: 'Singapore', names: ['singapore', 'changi'], codes: ['sin'] },
];

export const SUPPORTED_CITIES: readonly string[] = DESTINATIONS.map((d) => d.city);

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/**
 * Cities a destination query refers to. "Los Angeles", "Los Angeles, CA" and
 * "Los Angeles (LAX)" all match Los Angeles; "LA" matches only on its own, so
 * "La Jolla" does not. An unknown place matches nothing: results are never
 * substituted from another city.
 */
export function matchDestinations(query: string): string[] {
	const q = normalize(query);
	if (q.trim() === '') return [];
	return DESTINATIONS.filter(
		(d) => d.names.some((n) => q.includes(` ${n} `)) || d.codes.some((c) => q === ` ${c} `)
	).map((d) => d.city);
}

// ---------------------------------------------------------------------------
// Search state carried in the URL

export interface StaySearch {
	location: string;
	checkIn: string;
	checkOut: string;
	guests: number;
	/** Raw text of the maximum-price-per-night field; '' means no limit. */
	maxPrice: string;
	amenities: AmenityKey[];
}

export function readStaySearch(params: URLSearchParams): StaySearch {
	const guests = parseInt(params.get('guests') || '1', 10);
	return {
		location: params.get('location') || '',
		checkIn: params.get('checkIn') || '',
		checkOut: params.get('checkOut') || '',
		guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
		maxPrice: params.get('maxPrice') || '',
		amenities: (params.get('amenities') || '').split(',').filter(isAmenityKey),
	};
}

/** Query string for a search; empty values are left out. Order is stable. */
export function staySearchQuery(search: StaySearch): string {
	const params = new URLSearchParams();
	params.set('location', search.location);
	if (search.checkIn) params.set('checkIn', search.checkIn);
	if (search.checkOut) params.set('checkOut', search.checkOut);
	params.set('guests', String(search.guests));
	if (search.maxPrice.trim()) params.set('maxPrice', search.maxPrice.trim());
	const amenities = AMENITY_KEYS.filter((k) => search.amenities.includes(k as AmenityKey));
	if (amenities.length) params.set('amenities', amenities.join(','));
	return params.toString().replace(/\+/g, '%20');
}

// ---------------------------------------------------------------------------
// Validation

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v: string) => ISO_DATE.test(v) && isValid(parseISO(v));

export type DateCheck =
	| { status: 'none' }
	| { status: 'valid'; nights: number }
	| { status: 'invalid'; checkInError?: string; checkOutError?: string };

/** Both dates empty is allowed (prices then show per night only). */
export function checkStayDates(checkIn: string, checkOut: string): DateCheck {
	if (!checkIn && !checkOut) return { status: 'none' };
	const checkInError = !checkIn ? 'Enter a check-in date.' : !isIsoDate(checkIn) ? 'Enter a valid check-in date.' : undefined;
	let checkOutError = !checkOut ? 'Enter a check-out date.' : !isIsoDate(checkOut) ? 'Enter a valid check-out date.' : undefined;
	if (!checkInError && !checkOutError) {
		const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
		if (nights > 0) return { status: 'valid', nights };
		checkOutError = 'Check-out must be after check-in.';
	}
	return { status: 'invalid', checkInError, checkOutError };
}

export type PriceCheck = { status: 'none' } | { status: 'valid'; value: number } | { status: 'invalid'; error: string };

export function checkMaxPrice(raw: string): PriceCheck {
	const t = raw.trim();
	if (!t) return { status: 'none' };
	if (!/^\d+$/.test(t)) return { status: 'invalid', error: 'Enter the maximum price as a whole number of dollars, with no decimals.' };
	const value = Number(t);
	if (value < 1) return { status: 'invalid', error: 'The maximum price must be at least $1.' };
	return { status: 'valid', value };
}

// ---------------------------------------------------------------------------
// Filtering

/**
 * Listings in the given cities that cost at most maxPrice per night (when
 * set) and have every required amenity. Catalog order is kept.
 */
export function filterListings(
	listings: readonly StayScapeListing[],
	cities: readonly string[],
	maxPrice: number | null,
	amenities: readonly AmenityKey[]
): StayScapeListing[] {
	return listings.filter(
		(l) =>
			cities.includes(l.city) &&
			(maxPrice === null || l.nightlyPrice <= maxPrice) &&
			amenities.every((a) => l.amenities.includes(a))
	);
}

export function findListingBySlug(listings: readonly StayScapeListing[], slug: string | undefined): StayScapeListing | undefined {
	if (!slug) return undefined;
	return listings.find((l) => l.slug === slug) ?? listings.find((l) => l.legacySlug === slug);
}

// ---------------------------------------------------------------------------
// Display

/** "2026-12-10" -> "Thursday, December 10, 2026". */
export function formatLongDate(isoDate: string): string {
	const d = parseISO(isoDate);
	return isValid(d) ? format(d, 'EEEE, MMMM d, yyyy') : isoDate;
}

export function formatUsd(amount: number): string {
	return `$${amount.toLocaleString('en-US')}`;
}

export function listAmenities(keys: readonly AmenityKey[]): string {
	return keys.length ? keys.map(amenityLabel).join(', ') : 'None listed';
}
