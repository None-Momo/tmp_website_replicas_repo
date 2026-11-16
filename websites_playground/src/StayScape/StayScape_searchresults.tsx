import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Home, Search } from "lucide-react";
import { Link, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { STAYSCAPE_LISTINGS } from "./StayScape_listings_data";
import {
	AMENITIES,
	AmenityKey,
	StayScapeListing,
	SUPPORTED_CITIES,
	StaySearch,
	amenityLabel,
	checkMaxPrice,
	checkStayDates,
	filterListings,
	formatLongDate,
	formatUsd,
	listAmenities,
	matchDestinations,
	readStaySearch,
	staySearchQuery,
} from "./StayScape_search";

// Search results are computed from the structured catalog in
// StayScape_listings_data.ts. Every search condition (destination, dates,
// guests, maximum price, amenities) lives in the URL query string, so the
// results survive a refresh, Back, and the trip to a listing and back.

const PRIMARY = "inline-block bg-pink-600 text-white font-medium rounded-lg px-4 py-2 hover:bg-pink-700";
const SECONDARY = "inline-block bg-white text-gray-800 font-medium rounded-lg px-4 py-2 border border-gray-400 hover:bg-gray-100";
const INPUT = "block w-full rounded-lg border px-3 py-2 text-gray-900 bg-white";

const joinWords = (words: string[]) =>
	words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** Shared StayScape header with the site's existing controls. */
export const StayScapeHeader: React.FC = () => (
	<header className="bg-white border-b border-gray-200 sticky top-0 z-50">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div className="flex justify-between items-center h-16">
				<div className="flex items-center">
					<h1 className="text-2xl font-bold text-pink-500">StayScape</h1>
				</div>
				<div className="flex items-center space-x-6">
					<Link to="/stayscape_saved" className="text-sm font-medium text-gray-700 hover:text-gray-900">
						Saved searches
					</Link>
					<Link to="/itinerary" className="text-sm font-medium text-gray-700 hover:text-gray-900">
						Itinerary
					</Link>
					<button type="button" className="text-sm font-medium text-gray-700 hover:text-gray-900">
						Become a host
					</button>
					<button type="button" className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
						Try hosting
					</button>
					<button type="button" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Open menu">
						<svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<button type="button" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Open account menu">
						<svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</header>
);

export const ListingPhoto: React.FC<{ listing: StayScapeListing; className: string }> = ({ listing, className }) =>
	listing.photoUrl ? (
		// Decorative: the listing's name and description are given in text.
		<img src={listing.photoUrl} alt="" loading="lazy" className={`${className} object-cover`} />
	) : (
		<div aria-hidden="true" className={`${className} bg-gradient-to-br from-pink-100 to-fuchsia-200 flex items-center justify-center`}>
			<Home className="w-12 h-12 text-pink-400" />
		</div>
	);

export const ratingText = (l: StayScapeListing) =>
	l.rating === null ? "New listing, no reviews yet" : `Rated ${l.rating} out of 5 (${l.reviewCount.toLocaleString("en-US")} reviews)`;

const ListingCard: React.FC<{ listing: StayScapeListing; nights: number | null; detailsQuery: string }> = ({ listing, nights, detailsQuery }) => {
	const nameId = `listing-${listing.slug}-name`;
	return (
		<li>
			<article aria-labelledby={nameId} className="h-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
				<ListingPhoto listing={listing} className="w-full h-[220px]" />
				<div className="p-4 flex flex-col flex-1">
					<p className="text-sm text-gray-600">{listing.propertyType} in {listing.area}</p>
					<h3 id={nameId} className="text-lg font-bold text-gray-900 mt-1">{listing.name}</h3>
					{listing.highlight && <p className="text-sm text-gray-600 mt-1">{listing.highlight}</p>}
					<p className="text-sm text-gray-700 mt-2">{ratingText(listing)}</p>
					<p className="text-sm text-gray-700 mt-1"><span className="font-semibold">Amenities:</span> {listAmenities(listing.amenities)}</p>
					<p className="mt-3 text-gray-900"><span className="text-lg font-semibold">{formatUsd(listing.nightlyPrice)}</span> per night</p>
					{nights !== null && (
						<p className="text-sm text-gray-700">{formatUsd(listing.nightlyPrice * nights)} total for {nights} night{nights === 1 ? "" : "s"}</p>
					)}
					<div className="pt-4 mt-auto">
						<Link
							to={`/stayscape_details/${encodeURIComponent(listing.slug)}?${detailsQuery}`}
							aria-label={`View details for ${listing.name}`}
							className={PRIMARY}
						>
							View details
						</Link>
					</div>
				</div>
			</article>
		</li>
	);
};

interface Draft { location: string; checkIn: string; checkOut: string; guests: number }
type DraftErrors = Partial<Record<"location" | "checkIn" | "checkOut", string>>;

export default function StayScapeSearchResults() {
	const navigate = useNavigate();
	const navigationType = useNavigationType();
	const [params, setParams] = useSearchParams();
	const query = params.toString();
	const urlSearch = readStaySearch(params);

	// The search form edits a draft; Search applies it. Filters apply as soon
	// as they change. Filters live in local state and are copied into the URL
	// (replace): React Router updates the URL asynchronously, so a control
	// bound straight to the URL would drop keystrokes and clicks. The URL is
	// read back only when it changes by navigation (Back, Forward, a new
	// search), never after our own replace.
	const [draft, setDraft] = useState<Draft>({ location: urlSearch.location, checkIn: urlSearch.checkIn, checkOut: urlSearch.checkOut, guests: urlSearch.guests });
	const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
	const [filters, setFilters] = useState({ maxPrice: urlSearch.maxPrice, amenities: urlSearch.amenities });
	useEffect(() => {
		if (navigationType === "REPLACE") return;
		const s = readStaySearch(new URLSearchParams(query));
		setDraft({ location: s.location, checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests });
		setFilters({ maxPrice: s.maxPrice, amenities: s.amenities });
		setDraftErrors({});
	}, [query, navigationType]);
	const search: StaySearch = { ...urlSearch, ...filters };

	const errorSummaryRef = useRef<HTMLDivElement>(null);
	const [submitCount, setSubmitCount] = useState(0);
	useEffect(() => {
		if (submitCount > 0 && Object.keys(draftErrors).length > 0) errorSummaryRef.current?.focus();
	}, [submitCount, draftErrors]);

	const updateFilters = (changes: Partial<Pick<StaySearch, "maxPrice" | "amenities">>) => {
		const next = { ...filters, ...changes };
		setFilters(next);
		setParams(staySearchQuery({ ...urlSearch, ...next }), { replace: true });
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const errors: DraftErrors = {};
		if (!draft.location.trim()) errors.location = "Enter a destination.";
		const dc = checkStayDates(draft.checkIn, draft.checkOut);
		if (dc.status === "invalid") {
			if (dc.checkInError) errors.checkIn = dc.checkInError;
			if (dc.checkOutError) errors.checkOut = dc.checkOutError;
		}
		setDraftErrors(errors);
		setSubmitCount((c) => c + 1);
		if (Object.keys(errors).length > 0) return;
		navigate(`/stayscape_search?${staySearchQuery({ ...search, ...draft, location: draft.location.trim() })}`);
	};

	const cities = matchDestinations(search.location);
	const dates = checkStayDates(search.checkIn, search.checkOut);
	const nights = dates.status === "valid" ? dates.nights : null;
	const price = checkMaxPrice(search.maxPrice);
	const maxPrice = price.status === "valid" ? price.value : null;
	const inCities = filterListings(STAYSCAPE_LISTINGS, cities, null, []);
	const results = filterListings(STAYSCAPE_LISTINGS, cities, maxPrice, search.amenities);
	const where = joinWords(cities);

	// What is shown, in words: visible to everyone, and announced (debounced,
	// so typing a price does not trigger an announcement per keystroke).
	let summary: string;
	if (!search.location.trim()) summary = "Enter a destination to search for stays.";
	else if (cities.length === 0) summary = `No matching accommodations found for "${search.location}". StayScape has stays in ${joinWords([...SUPPORTED_CITIES])}.`;
	else if (results.length === 0) summary = `No matching accommodations found. None of the ${inCities.length} stays in ${where} match your filters.`;
	else summary = `Showing ${results.length} of ${inCities.length} stays in ${where}.`;
	const filterParts: string[] = [];
	if (maxPrice !== null) filterParts.push(`up to ${formatUsd(maxPrice)} per night`);
	if (search.amenities.length) filterParts.push(`must have ${joinWords(search.amenities.map(amenityLabel))}`);
	const filterLine = filterParts.length ? `Filters: ${filterParts.join("; ")}.` : "No filters applied.";
	const datesLine = nights !== null
		? `Dates: check-in ${formatLongDate(search.checkIn)}, check-out ${formatLongDate(search.checkOut)}, ${nights} night${nights === 1 ? "" : "s"}, ${search.guests} guest${search.guests === 1 ? "" : "s"}. Totals are for these dates.`
		: "Add check-in and check-out dates to see total prices.";
	const announcement = `${summary} ${cities.length ? filterLine : ""}`.trim();
	const [announced, setAnnounced] = useState("");
	useEffect(() => {
		const t = setTimeout(() => setAnnounced(announcement), 600);
		return () => clearTimeout(t);
	}, [announcement]);

	const fieldError = (key: keyof DraftErrors) => draftErrors[key] ? (
		<p id={`stay-search-${key}-error`} className="text-sm text-red-700 mt-1"><span className="sr-only">Error: </span>{draftErrors[key]}</p>
	) : null;
	const errorProps = (key: keyof DraftErrors) => draftErrors[key]
		? { "aria-invalid": true as const, "aria-describedby": `stay-search-${key}-error` }
		: {};
	const urlDateError = dates.status === "invalid" ? (dates.checkOutError || dates.checkInError) : "";

	return (
		<div className="min-h-screen bg-gray-50">
			<StayScapeHeader />

			{/* Main Search Section */}
			<div className="bg-white border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
					<div className="flex items-center space-x-2 mb-4">
						<button type="button" className="text-sm text-gray-600 hover:text-gray-900">Stays</button>
						<button type="button" className="text-sm text-gray-500 hover:text-gray-900">Experiences</button>
					</div>

					<h2 className="sr-only" id="stay-search-heading">Search stays</h2>
					{Object.keys(draftErrors).length > 0 && (
						<div ref={errorSummaryRef} tabIndex={-1} role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
							<p className="font-semibold">The search was not updated:</p>
							<ul className="list-disc pl-5">{Object.values(draftErrors).map((m) => <li key={m}>{m}</li>)}</ul>
						</div>
					)}
					<form role="search" aria-labelledby="stay-search-heading" onSubmit={handleSearch} noValidate className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
						<div className="md:col-span-2">
							<label htmlFor="stay-search-location" className="block text-sm font-semibold text-gray-800 mb-1">Destination</label>
							<input id="stay-search-location" type="text" autoComplete="off" placeholder="San Diego" value={draft.location}
								onChange={(e) => setDraft({ ...draft, location: e.target.value })}
								className={`${INPUT} ${draftErrors.location ? "border-red-600" : "border-gray-300"}`} {...errorProps("location")} />
							{fieldError("location")}
						</div>
						<div>
							<label htmlFor="stay-search-check-in" className="block text-sm font-semibold text-gray-800 mb-1">Check-in date</label>
							<input id="stay-search-check-in" type="date" value={draft.checkIn}
								onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })}
								className={`${INPUT} ${draftErrors.checkIn ? "border-red-600" : "border-gray-300"}`} {...errorProps("checkIn")} />
							{fieldError("checkIn")}
						</div>
						<div>
							<label htmlFor="stay-search-check-out" className="block text-sm font-semibold text-gray-800 mb-1">Check-out date</label>
							<input id="stay-search-check-out" type="date" value={draft.checkOut}
								onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })}
								className={`${INPUT} ${draftErrors.checkOut ? "border-red-600" : "border-gray-300"}`} {...errorProps("checkOut")} />
							{fieldError("checkOut")}
						</div>
						<div className="flex gap-3 items-end">
							<div className="flex-1">
								<label htmlFor="stay-search-guests" className="block text-sm font-semibold text-gray-800 mb-1">Guests</label>
								<select id="stay-search-guests" value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: Number(e.target.value) })} className={`${INPUT} border-gray-300`}>
									{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} guest{n === 1 ? "" : "s"}</option>)}
								</select>
							</div>
							<button type="submit" className="bg-pink-600 text-white px-5 py-2 rounded-lg hover:bg-pink-700 flex items-center gap-2">
								<Search className="h-5 w-5" aria-hidden="true" />
								<span>Search</span>
							</button>
						</div>
					</form>

					<section aria-labelledby="stay-filters-heading" className="mt-6 border-t border-gray-200 pt-4">
						<h2 id="stay-filters-heading" className="text-lg font-semibold text-gray-900 mb-3">Filters</h2>
						<div className="flex flex-col md:flex-row md:items-start gap-6">
							<div>
								<label htmlFor="stay-filter-max-price" className="block text-sm font-semibold text-gray-800 mb-1">Maximum price per night (USD)</label>
								<input id="stay-filter-max-price" type="number" min={1} step={1} inputMode="numeric" value={search.maxPrice}
									onChange={(e) => updateFilters({ maxPrice: e.target.value })}
									aria-describedby={`stay-filter-max-price-hint${price.status === "invalid" ? " stay-filter-max-price-error" : ""}`}
									aria-invalid={price.status === "invalid" ? true : undefined}
									className={`${INPUT} w-48 ${price.status === "invalid" ? "border-red-600" : "border-gray-300"}`} />
								<p id="stay-filter-max-price-hint" className="text-sm text-gray-600 mt-1">Leave empty for no limit.</p>
								{price.status === "invalid" && (
									<p id="stay-filter-max-price-error" className="text-sm text-red-700 mt-1"><span className="sr-only">Error: </span>{price.error} The price filter is not applied.</p>
								)}
							</div>
							<fieldset>
								<legend className="text-sm font-semibold text-gray-800 mb-1">Amenities (show only stays that have all selected)</legend>
								<div className="flex flex-wrap gap-x-5 gap-y-2">
									{AMENITIES.map((a) => (
										<label key={a.key} className="inline-flex items-center gap-2 text-gray-800">
											<input type="checkbox" className="h-4 w-4" checked={search.amenities.includes(a.key)}
												onChange={(e) => updateFilters({
													amenities: e.target.checked
														? [...search.amenities, a.key as AmenityKey]
														: search.amenities.filter((k) => k !== a.key),
												})} />
											{a.label}
										</label>
									))}
								</div>
							</fieldset>
							<div className="md:ml-auto">
								<button type="button" className={SECONDARY}onClick={() => updateFilters({ maxPrice: "", amenities: [] })}>
									Clear filters
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<h2 className="text-xl font-semibold text-gray-900" id="stay-results-heading">
					Search results{search.location.trim() ? ` for ${search.location.trim()}` : ""}
				</h2>
				<div className="mt-2 text-gray-800 space-y-1">
					<p className="font-medium">{summary}</p>
					{cities.length > 0 && <p>{filterLine}</p>}
					{cities.length > 0 && (urlDateError
						? <p className="text-red-700">{urlDateError} Totals are not shown.</p>
						: <p>{datesLine}</p>)}
				</div>
				<p className="sr-only" role="status" aria-live="polite">{announced}</p>
				{results.length > 0 && (
					<ul aria-labelledby="stay-results-heading" className="list-none p-0 mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{results.map((listing) => (
							<ListingCard key={listing.id} listing={listing} nights={nights} detailsQuery={staySearchQuery(search)} />
						))}
					</ul>
				)}
			</div>

			{/* Footer */}
			<footer className="bg-white border-t border-gray-200 mt-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
							<ul className="space-y-3">
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Help Center
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										AirCover
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Anti-discrimination
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Disability support
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Cancellation options
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Report neighborhood concern
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">Hosting</h3>
							<ul className="space-y-3">
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Try hosting
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										AirCover for Hosts
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Hosting resources
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Community forum
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Hosting responsibly
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Join a free Hosting class
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Find a co-host
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h3 className="text-sm font-semibold text-gray-900 mb-4">StayScape</h3>
							<ul className="space-y-3">
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										2025 Summer Release
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Newsroom
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										New features
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Careers
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Investors
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Gift cards
									</a>
								</li>
								<li>
									<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">
										Emergency stays
									</a>
								</li>
							</ul>
						</div>
					</div>

					<div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
						<div className="flex items-center space-x-4 mb-4 md:mb-0">
							<p className="text-sm text-gray-600">© 2025 StayScape, Inc.</p>
							<div className="flex items-center space-x-4">
								<button type="button" className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900" aria-label="Change language: English (US)">
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
									</svg>
									<span>English (US)</span>
									<ChevronDown className="h-4 w-4" aria-hidden="true" />
								</button>
								<button type="button" className="text-sm text-gray-600 hover:text-gray-900" aria-label="Change currency: US dollars">$ USD</button>
							</div>
						</div>
						<div className="flex items-center space-x-6">
							<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">Facebook</a>
							<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">X</a>
							<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">Instagram</a>
							<a href="#main-content" className="text-sm text-gray-600 hover:text-gray-900">TikTok</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
