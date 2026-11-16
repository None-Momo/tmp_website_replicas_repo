import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { STAYSCAPE_LISTINGS } from "./StayScape_listings_data";
import {
	amenityLabel,
	checkStayDates,
	findListingBySlug,
	formatLongDate,
	formatUsd,
	readStaySearch,
	staySearchQuery,
} from "./StayScape_search";
import { ListingPhoto, StayScapeHeader, ratingText } from "./StayScape_searchresults";
import { setItineraryStay } from "../itinerary/itinerary_data";

const INPUT = "block w-full rounded-lg border px-3 py-2 text-gray-900 bg-white";

// The stay's dates and guests travel in the query string from the results
// page, so they survive a refresh. They can also be changed here; the URL is
// updated in place so Back still returns to the results.
export const StayScapeDetails: React.FC = () => {
	const navigate = useNavigate();
	const { slug } = useParams<{ slug?: string }>();
	const [params, setParams] = useSearchParams();
	const listing = findListingBySlug(STAYSCAPE_LISTINGS, slug);
	const urlSearch = readStaySearch(params);
	// Local copy of the stay fields, mirrored into the URL (replace); see the
	// note on filters in StayScape_searchresults.tsx.
	const [stay, setStayState] = useState({ checkIn: urlSearch.checkIn, checkOut: urlSearch.checkOut, guests: urlSearch.guests });
	const search = { ...urlSearch, ...stay };
	const dates = checkStayDates(search.checkIn, search.checkOut);
	const nights = dates.status === "valid" ? dates.nights : null;

	const headingRef = useRef<HTMLHeadingElement>(null);
	const alertRef = useRef<HTMLDivElement>(null);
	useEffect(() => { headingRef.current?.focus(); }, [slug]);

	const [status, setStatus] = useState("");
	const [addError, setAddError] = useState("");
	const [attempts, setAttempts] = useState(0);
	useEffect(() => { if (attempts > 0 && addError) alertRef.current?.focus(); }, [attempts, addError]);

	if (!listing) {
		return (
			<div className="text-center py-12" role="alert">
				<h1 className="text-xl font-semibold text-gray-900 mb-2">Listing not found</h1>
				<p className="text-gray-600 mb-4">We couldn't find a listing matching this link.</p>
				<button type="button" className="text-pink-600 hover:underline" onClick={() => navigate('/stayscape')}>
					Back to search
				</button>
			</div>
		);
	}

	const setStay = (changes: { checkIn?: string; checkOut?: string; guests?: number }) => {
		setStatus("");
		setAddError("");
		const next = { ...stay, ...changes };
		setStayState(next);
		setParams(staySearchQuery({ ...urlSearch, ...next }), { replace: true });
	};

	const handleAdd = () => {
		setAttempts((n) => n + 1);
		if (dates.status !== "valid") {
			setStatus("");
			setAddError(dates.status === "none"
				? "Enter check-in and check-out dates before adding this stay to your itinerary."
				: `${dates.checkOutError || dates.checkInError} The stay was not added to your itinerary.`);
			return;
		}
		const outcome = setItineraryStay({
			listingSlug: listing.slug,
			name: listing.name,
			destination: listing.city,
			area: listing.area,
			checkIn: search.checkIn,
			checkOut: search.checkOut,
			nights: dates.nights,
			guests: search.guests,
			nightlyPrice: listing.nightlyPrice,
			totalPrice: listing.nightlyPrice * dates.nights,
			amenities: listing.amenities.map(amenityLabel),
		});
		if (!outcome.ok) {
			setStatus("");
			setAddError("The stay could not be added because browser storage is unavailable.");
			return;
		}
		setAddError("");
		setStatus(`${outcome.replaced ? "Your itinerary's stay was replaced with" : "Added"} ${listing.name}, check-in ${formatLongDate(search.checkIn)}, check-out ${formatLongDate(search.checkOut)}${outcome.replaced ? "." : ", to your itinerary."}`);
	};

	const backTo = search.location ? `/stayscape_search?${staySearchQuery(search)}` : "/stayscape";
	const dateError = dates.status === "invalid" ? dates : null;

	return (
		<div className="min-h-screen bg-gray-50">
			<StayScapeHeader />

			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<p className="mb-4"><Link to={backTo} className="text-pink-700 underline hover:text-pink-800">{search.location ? "Back to search results" : "Back to search"}</Link></p>
				<p className="text-sm text-gray-600">{listing.propertyType} in {listing.area}, {listing.city}</p>
				<h2 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-gray-900 mt-1 mb-4">{listing.name}</h2>

				<div className="grid gap-8 md:grid-cols-5">
					<div className="md:col-span-3">
						<ListingPhoto listing={listing} className="w-full h-[320px] rounded-xl" />
						<dl className="mt-4 space-y-1 text-gray-800">
							{listing.highlight && <div><dt className="inline font-semibold">Highlights: </dt><dd className="inline">{listing.highlight}</dd></div>}
							<div><dt className="inline font-semibold">Rating: </dt><dd className="inline">{ratingText(listing).replace(/^Rated /, "")}</dd></div>
							<div><dt className="inline font-semibold">Price per night: </dt><dd className="inline">{formatUsd(listing.nightlyPrice)}</dd></div>
						</dl>
						<section aria-labelledby="stay-amenities-heading" className="mt-6">
							<h3 id="stay-amenities-heading" className="text-xl font-semibold text-gray-900 mb-2">Amenities</h3>
							{listing.amenities.length ? (
								<ul className="list-disc pl-5 text-gray-800">{listing.amenities.map((a) => <li key={a}>{amenityLabel(a)}</li>)}</ul>
							) : <p className="text-gray-700">No amenities listed.</p>}
						</section>
					</div>

					<section aria-labelledby="stay-booking-heading" className="md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-5 h-fit">
						<h3 id="stay-booking-heading" className="text-xl font-semibold text-gray-900 mb-3">Your stay</h3>
						<div className="space-y-3">
							<div>
								<label htmlFor="stay-details-check-in" className="block text-sm font-semibold text-gray-800 mb-1">Check-in date</label>
								<input id="stay-details-check-in" type="date" value={search.checkIn} onChange={(e) => setStay({ checkIn: e.target.value })}
									aria-invalid={dateError?.checkInError ? true : undefined} aria-describedby={dateError?.checkInError ? "stay-details-check-in-error" : undefined}
									className={`${INPUT} ${dateError?.checkInError ? "border-red-600" : "border-gray-300"}`} />
								{dateError?.checkInError && <p id="stay-details-check-in-error" className="text-sm text-red-700 mt-1"><span className="sr-only">Error: </span>{dateError.checkInError}</p>}
							</div>
							<div>
								<label htmlFor="stay-details-check-out" className="block text-sm font-semibold text-gray-800 mb-1">Check-out date</label>
								<input id="stay-details-check-out" type="date" value={search.checkOut} onChange={(e) => setStay({ checkOut: e.target.value })}
									aria-invalid={dateError?.checkOutError ? true : undefined} aria-describedby={dateError?.checkOutError ? "stay-details-check-out-error" : undefined}
									className={`${INPUT} ${dateError?.checkOutError ? "border-red-600" : "border-gray-300"}`} />
								{dateError?.checkOutError && <p id="stay-details-check-out-error" className="text-sm text-red-700 mt-1"><span className="sr-only">Error: </span>{dateError.checkOutError}</p>}
							</div>
							<div>
								<label htmlFor="stay-details-guests" className="block text-sm font-semibold text-gray-800 mb-1">Guests</label>
								<select id="stay-details-guests" value={search.guests} onChange={(e) => setStay({ guests: Number(e.target.value) })} className={`${INPUT} border-gray-300`}>
									{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} guest{n === 1 ? "" : "s"}</option>)}
								</select>
							</div>
						</div>
						<p className="mt-4 text-gray-900">
							{nights !== null
								? <>{formatUsd(listing.nightlyPrice)} per night for {nights} night{nights === 1 ? "" : "s"}: <span className="font-semibold">{formatUsd(listing.nightlyPrice * nights)} total</span></>
								: <>{formatUsd(listing.nightlyPrice)} per night. Enter dates to see the total.</>}
						</p>
						<button type="button" onClick={handleAdd} className="mt-4 w-full bg-pink-600 text-white font-medium rounded-lg px-4 py-2 hover:bg-pink-700">
							Add to itinerary
						</button>
						{addError && (
							<div ref={alertRef} tabIndex={-1} role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">{addError}</div>
						)}
						<div role="status" aria-live="polite" className={status ? "mt-4 rounded-lg border border-green-300 bg-green-50 text-green-900 px-4 py-3" : "mt-4"}>{status}</div>
						{status && <p className="mt-2"><Link to="/itinerary" className="text-pink-700 underline hover:text-pink-800">View itinerary</Link></p>}
					</section>
				</div>
			</div>

			<button type="button" aria-label="Finish and go to confirmation page" className="fixed bottom-8 right-8 bg-pink-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-pink-700" onClick={() => navigate("/done")}>
				Done
			</button>
		</div>
	);
};
